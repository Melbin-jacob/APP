import { NextResponse } from "next/server";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { reviewSubmitInput, submitReview } from "@/server/services/reviews";

// POST /api/reviews — submit a review with a single-use token from the email.
export const POST = route(async (req) => {
  const ip = ipHash(req);
  await enforceRateLimit("reviewSubmit", ip);
  const input = await parseJson(req, reviewSubmitInput);
  const result = await submitReview(input, ip);
  return NextResponse.json(result, { status: 201 });
});
