import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Bridges Web-standard handlers onto Vercel's Node.js function signature.
 *
 * The endpoints in this project are written against `Request`/`Response`
 * because that keeps streaming ergonomic, but the runtime here invokes
 * `(req, res)` — a Response returned directly is ignored and the invocation
 * hangs until it times out. This adapter converts in both directions and pipes
 * streaming bodies chunk by chunk so tokens still reach the browser live.
 */
export function nodeHandler(fn: (request: Request) => Promise<Response>) {
  return async function (req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const method = req.method ?? "GET";

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }

      let body: Buffer | undefined;
      if (method !== "GET" && method !== "HEAD") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        body = Buffer.concat(chunks);
      }

      const host = headers.get("host") ?? "localhost";
      const proto = headers.get("x-forwarded-proto") ?? "https";
      const request = new Request(`${proto}://${host}${req.url ?? "/"}`, {
        method,
        headers,
        body: body?.length ? new Uint8Array(body) : undefined,
      });

      const response = await fn(request);

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        // Content length is recomputed by the runtime; forwarding it breaks streams.
        if (key.toLowerCase() === "content-length") return;
        res.setHeader(key, value);
      });

      if (!response.body) {
        res.end();
        return;
      }

      // Flush headers immediately so streamed responses start rendering at once.
      res.flushHeaders?.();

      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
      res.end();
    } catch (err) {
      console.error("[node-adapter] handler failed:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
      }
      res.end(JSON.stringify({ error: "Unexpected server error" }));
    }
  };
}
