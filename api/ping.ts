import { nodeHandler } from "./_lib/node-adapter.js";

/** Health check — confirms the function runtime and adapter are alive. */
async function handler(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, service: "launchpad-rv" }), {
    headers: { "content-type": "application/json" },
  });
}

export default nodeHandler(handler);
