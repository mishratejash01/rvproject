import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import { ApiError } from "./http.js";

/**
 * Service-role client. Bypasses RLS, so every call site must check ownership
 * explicitly — see `requireProjectAccess`.
 */
export function serviceClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolves the calling user from the request's bearer token. */
export async function requireUser(req: Request): Promise<{ id: string; email: string | null }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new ApiError(401, "Sign in to use this feature.");
  }

  const db = serviceClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    throw new ApiError(401, "Your session expired — sign in again.");
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Loads a project the caller owns, or throws. */
export async function requireOwnedProject(db: SupabaseClient, projectId: string, userId: string) {
  const { data, error } = await db
    .from("projects")
    .select("*, domain:domains(*)")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load the project.", error.message);
  if (!data) throw new ApiError(404, "Project not found.");
  if (data.owner_id !== userId) throw new ApiError(403, "This project belongs to another founder.");
  return data;
}

/** Best-effort activity trail write — never blocks the main response. */
export async function logActivity(
  db: SupabaseClient,
  userId: string,
  projectId: string,
  eventType: string,
  meta: Record<string, unknown> = {},
) {
  const { error } = await db
    .from("activity_log")
    .insert({ user_id: userId, project_id: projectId, event_type: eventType, meta });
  if (error) console.warn("[activity] failed to record", eventType, error.message);
}
