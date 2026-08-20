import { nodeHandler } from "./_lib/node-adapter.js";
import { ApiError, errorResponse, requirePost } from "./_lib/http.js";

import { handler as validate } from "./_lib/modules/validate.js";
import { handler as investibility } from "./_lib/modules/investibility.js";
import { handler as pivots } from "./_lib/modules/pivots.js";
import { handler as deck } from "./_lib/modules/deck.js";
import { handler as matches } from "./_lib/modules/matches.js";
import { handler as grants } from "./_lib/modules/grants.js";
import { handler as benchmarks } from "./_lib/modules/benchmarks.js";
import { handler as outreach } from "./_lib/modules/outreach.js";
import { handler as interviewScore } from "./_lib/modules/interview-score.js";
import { handler as readiness } from "./_lib/modules/readiness.js";
import { handler as priorArt } from "./_lib/modules/prior-art.js";
import { handler as cofounderMatch } from "./_lib/modules/cofounder-match.js";
import { handler as problemMatch } from "./_lib/modules/problem-match.js";
import { handler as foundersAgreement } from "./_lib/modules/founders-agreement.js";

// Longest-running action governs the whole router; the deck is the slowest.
export const config = { maxDuration: 90 };

/**
 * Single entry point for every structured AI action.
 *
 * These began as one serverless function per module, which is tidier to read
 * but exceeds the deployment's function budget. Routing them through one
 * function keeps each module's logic untouched in `_lib/modules` (the
 * underscore keeps that directory out of the function build) while presenting
 * one deployable surface. Streaming chat stays separate because it returns a
 * fundamentally different response type.
 */
const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  validate,
  investibility,
  pivots,
  deck,
  matches,
  grants,
  benchmarks,
  outreach,
  "interview-score": interviewScore,
  readiness,
  "prior-art": priorArt,
  "cofounder-match": cofounderMatch,
  "problem-match": problemMatch,
  "founders-agreement": foundersAgreement,
};

async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "";
    const route = ROUTES[action];
    if (!route) {
      throw new ApiError(404, `Unknown action "${action}".`, { known: Object.keys(ROUTES) });
    }

    // Each module re-reads the body, so hand it a request it can consume.
    return await route(req);
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
