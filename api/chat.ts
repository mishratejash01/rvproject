import { streamText, userStep, modelStep, type Step } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { buildFullContext } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 90 };

/**
 * War Room — streaming conversation for both Roast Mode and the simulated
 * Investment Committee. Tokens reach the browser as they are produced; the
 * assistant turn is persisted once the stream completes.
 */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");
    const message = requireField(body, "message");
    const mode = (body.mode as string) === "ic_panel" ? "ic_panel" : "roast";

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    // Reuse the caller's session when provided, otherwise open a new one.
    let sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    if (sessionId) {
      const { data: existing } = await db
        .from("chat_sessions")
        .select("id, user_id, mode")
        .eq("id", sessionId)
        .maybeSingle();
      if (!existing || existing.user_id !== user.id) sessionId = null;
    }
    if (!sessionId) {
      const { data: created, error } = await db
        .from("chat_sessions")
        .insert({ project_id: project.id, user_id: user.id, mode })
        .select("id")
        .single();
      if (error) throw new ApiError(500, "Could not start the session.", error.message);
      sessionId = created.id as string;
    }

    // Capture as a const so the streaming callbacks below see a definite value.
    const activeSession: string = sessionId;

    const { data: history } = await db
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", activeSession)
      .order("id");

    const steps: Step[] = (history ?? []).map((m) =>
      m.role === "user" ? userStep(m.content) : modelStep(m.content),
    );
    steps.push(userStep(message));

    const context = await buildFullContext(db, project, { validation: true, investibility: true });
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      mode === "ic_panel" ? "ic_chat" : "roast_chat",
      { roastMode: mode === "roast", project: context },
    );

    await db.from("chat_messages").insert({ session_id: activeSession, role: "user", content: message });

    const upstream = await streamText({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: steps,
    });

    // Tee the stream: forward every chunk to the browser while accumulating the
    // full reply so it can be stored when the model finishes.
    const decoder = new TextDecoder();
    let full = "";
    const capture = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        full += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        if (!full.trim()) return;
        await db.from("chat_messages").insert({
          session_id: activeSession,
          role: "assistant",
          content: full.trim(),
        });
        await logActivity(db, user.id, project.id, mode === "ic_panel" ? "ic_defended" : "roasted", {
          session_id: activeSession,
        });
      },
    });

    return new Response(upstream.pipeThrough(capture), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-session-id": activeSession,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
