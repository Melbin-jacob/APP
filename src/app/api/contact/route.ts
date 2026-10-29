import { NextResponse } from "next/server";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { contactInput, sendContactMessage } from "@/server/services/contact";

// POST /api/contact — public "Contact us" form; emails the team.
export const POST = route(async (req) => {
  const visitor = ipHash(req);
  await enforceRateLimit("contact", visitor);
  const input = await parseJson(req, contactInput);
  // Bots that fill the hidden field get a normal-looking reply and nothing is sent.
  if (input.website) return NextResponse.json({ ok: true }, { status: 201 });
  await sendContactMessage(input, visitor);
  return NextResponse.json({ ok: true }, { status: 201 });
});
