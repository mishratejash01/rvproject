import { supabase } from "./supabase";

/** Thin client for the serverless AI endpoints. Always sends the user's token. */

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to run this.");
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

export class ApiCallError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiCallError(message, res.status);
  }
  return (await res.json()) as T;
}

/** All structured AI actions are served by one function, selected by `action`. */
const MODULE = (action: string) => `/api/module?action=${action}`;

export const api = {
  validate: (projectId: string, roastMode?: boolean) =>
    post<{ validation: any }>(MODULE("validate"), { projectId, roastMode }),

  investibility: (projectId: string, roastMode?: boolean) =>
    post<{ report: any }>(MODULE("investibility"), { projectId, roastMode }),

  pivots: (projectId: string, roastMode?: boolean) =>
    post<{ pivots: any[] }>(MODULE("pivots"), { projectId, roastMode }),

  deck: (projectId: string) => post<{ deck: any; ask: any }>(MODULE("deck"), { projectId }),

  matches: (projectId: string) => post<{ matches: any[] }>(MODULE("matches"), { projectId }),

  grants: (projectId: string) => post<{ matches: any[] }>(MODULE("grants"), { projectId }),

  benchmarks: (projectId: string) => post<{ comparisons: any[] }>(MODULE("benchmarks"), { projectId }),

  outreach: (projectId: string, investorId: number) =>
    post<{ drafts: any[] }>(MODULE("outreach"), { projectId, investorId }),

  /**
   * Streams a war-room reply. `onToken` fires per chunk; resolves with the full
   * text and the session id so the caller can continue the conversation.
   */
  async chat(
    params: { projectId: string; message: string; mode: "roast" | "ic_panel"; sessionId?: string | null },
    onToken: (chunk: string) => void,
  ): Promise<{ text: string; sessionId: string | null }> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify(params),
    });

    if (!res.ok || !res.body) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        /* ignore */
      }
      throw new ApiCallError(message, res.status);
    }

    const sessionId = res.headers.get("x-session-id");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      onToken(chunk);
    }
    return { text, sessionId };
  },
};

/* ── Modules added in the second build phase ───────────────────────── */

export const api2 = {
  interviewScore: (projectId: string, evidenceId: string) =>
    post<{ evidence: any }>(MODULE("interview-score"), { projectId, evidenceId }),

  readiness: (projectId: string, scale: "trl" | "irl") =>
    post<{ assessment: any; detail: any }>(MODULE("readiness"), { projectId, scale }),

  priorArt: (projectId: string, findings: unknown[] = []) =>
    post<{ search: any; detail: any }>(MODULE("prior-art"), { projectId, findings }),

  cofounderMatch: (projectId: string) =>
    post<{ matches: any[]; still_missing: string | null }>(MODULE("cofounder-match"), { projectId }),

  problemMatch: (projectId: string) => post<{ fits: any[] }>(MODULE("problem-match"), { projectId }),

  foundersAgreement: (projectId: string) =>
    post<{ agreement: any }>(MODULE("founders-agreement"), { projectId }),
};
