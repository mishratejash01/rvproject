/** Shared HTTP helpers for the serverless API layer. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

/** Turns any thrown value into a clean JSON error response. */
export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return json({ error: err.message, detail: err.detail ?? null }, err.status);
  }
  const message = err instanceof Error ? err.message : "Unexpected server error";
  console.error("[api] unhandled:", err);
  return json({ error: message }, 500);
}

export function requirePost(req: Request) {
  if (req.method !== "POST") {
    throw new ApiError(405, "Method not allowed — use POST.");
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

/** Reads a required string field from a request body. */
export function requireField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `Missing required field: ${key}`);
  }
  return value;
}
