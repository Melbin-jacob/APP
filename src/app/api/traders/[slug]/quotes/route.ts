import { NextResponse } from "next/server";
import { getPrincipal } from "@/server/auth";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { createQuoteRequest, quoteInput } from "@/server/services/quotes";

// POST /api/traders/:slug/quotes — public "Request a quote" form.
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const visitor = ipHash(req);
  await enforceRateLimit("quoteRequest", visitor);
  const input = await parseJson(req, quoteInput);
  // Bots that fill the hidden field get a normal-looking reply and nothing is sent.
  if (input.website) return NextResponse.json({ ok: true, sentToBusiness: true }, { status: 201 });
  const user = await getPrincipal();
  const result = await createQuoteRequest((await params).slug, input, { customerId: user?.id, ipHash: visitor });
  return NextResponse.json({ ok: true, sentToBusiness: result.sentToBusiness }, { status: 201 });
});
