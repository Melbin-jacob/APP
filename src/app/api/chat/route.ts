import { NextResponse } from "next/server";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { chat, chatInput } from "@/server/services/chat";
import { getVisitor } from "@/server/visitor";

// POST /api/chat { messages } → { reply, results, suggestions } for the
// "Get help" assistant. Nothing is stored.
export const POST = route(async (req) => {
  const ip = ipHash(req);
  await enforceRateLimit("chat", ip);
  await enforceRateLimit("chatDaily", ip);
  const { messages } = await parseJson(req, chatInput);
  const { country } = await getVisitor();
  return NextResponse.json(await chat(messages, country));
});
