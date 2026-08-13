import { env } from "./env.js";
import { ApiError } from "./http.js";

/**
 * Client for the Gemini Interactions API.
 *
 * Endpoint contract (verified against the live API):
 *   POST /v1beta/interactions
 *   body: { model, input, system_instruction?, response_format?, stream?, store? }
 *   text lives in steps[] entries of type "model_output"; "thought" steps are internal.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export type Step = {
  type: "user_input" | "model_output";
  content: Array<{ type: "text"; text: string }>;
};

export function userStep(text: string): Step {
  return { type: "user_input", content: [{ type: "text", text }] };
}

export function modelStep(text: string): Step {
  return { type: "model_output", content: [{ type: "text", text }] };
}

type BaseOptions = {
  model: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number | null;
};

type CallOptions = BaseOptions & {
  input: string | Step[];
  /** JSON Schema — when present the model is forced to return matching JSON. */
  responseFormat?: Record<string, unknown>;
};

function buildBody(opts: CallOptions, stream: boolean) {
  const body: Record<string, unknown> = {
    model: opts.model,
    input: opts.input,
    store: false,
  };
  if (opts.systemInstruction) body.system_instruction = opts.systemInstruction;
  if (opts.responseFormat) body.response_format = opts.responseFormat;
  if (stream) body.stream = true;

  // Sampling settings belong under generation_config; the API rejects them at the root.
  const generation: Record<string, unknown> = {};
  if (typeof opts.temperature === "number") generation.temperature = opts.temperature;
  if (opts.maxOutputTokens) generation.max_output_tokens = opts.maxOutputTokens;
  if (Object.keys(generation).length > 0) body.generation_config = generation;

  return body;
}

/** Extracts the concatenated text of all model_output steps. */
function extractText(payload: any): string {
  const steps: any[] = Array.isArray(payload?.steps) ? payload.steps : [];
  return steps
    .filter((s) => s?.type === "model_output")
    .flatMap((s) => (Array.isArray(s.content) ? s.content : []))
    .filter((c: any) => c?.type === "text" && typeof c.text === "string")
    .map((c: any) => c.text)
    .join("")
    .trim();
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function post(body: unknown, stream: boolean, attempt = 0): Promise<Response> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
      ...(stream ? { accept: "text/event-stream" } : {}),
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return res;

  // The free tier rate-limits per minute; back off and retry rather than failing the user.
  if (RETRYABLE.has(res.status) && attempt < 3) {
    const wait = 700 * 2 ** attempt + Math.floor(Math.random() * 400);
    await new Promise((r) => setTimeout(r, wait));
    return post(body, stream, attempt + 1);
  }

  const detail = await res.text().catch(() => "");
  if (res.status === 429) {
    throw new ApiError(429, "The AI engine is busy right now. Wait a few seconds and try again.", detail.slice(0, 400));
  }
  throw new ApiError(502, "The AI engine could not complete this request.", detail.slice(0, 400));
}

/** Single-shot text generation. */
export async function generateText(opts: CallOptions): Promise<string> {
  const res = await post(buildBody(opts, false), false);
  const payload = await res.json();
  const text = extractText(payload);
  if (!text) throw new ApiError(502, "The AI engine returned an empty response.");
  return text;
}

/**
 * Structured generation. `schema` is JSON Schema; the parsed object is returned.
 * Handles models that wrap JSON in markdown fences defensively.
 */
export async function generateObject<T = unknown>(
  opts: BaseOptions & { input: string | Step[]; schema: Record<string, unknown> },
): Promise<T> {
  const text = await generateText({ ...opts, responseFormat: opts.schema });
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: salvage the outermost JSON object from surrounding prose.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    throw new ApiError(502, "The AI engine returned malformed data. Try again.", cleaned.slice(0, 300));
  }
}

/**
 * Streaming generation as a plain-text ReadableStream of answer tokens.
 * Internal "thought" steps are filtered out so only the answer reaches the client.
 */
export async function streamText(opts: CallOptions): Promise<ReadableStream<Uint8Array>> {
  const res = await post(buildBody(opts, true), true);
  const body = res.body;
  if (!body) throw new ApiError(502, "The AI engine returned no stream.");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const outputStepIndexes = new Set<number>();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const evt of events) {
            const line = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            let payload: any;
            try {
              payload = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }

            // Track which step indexes are answer text (vs internal thoughts).
            if (payload.event_type === "step.start" && payload.step?.type === "model_output") {
              outputStepIndexes.add(payload.index);
            }
            if (
              payload.event_type === "step.delta" &&
              outputStepIndexes.has(payload.index) &&
              payload.delta?.type === "text" &&
              typeof payload.delta.text === "string"
            ) {
              controller.enqueue(encoder.encode(payload.delta.text));
            }
          }
        }
      } catch (err) {
        console.error("[gemini] stream error:", err);
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}
