import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/server/error-alerts";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";

const report = z.object({
  name: z.string().max(100).default("Error"),
  message: z.string().max(1000),
  stack: z.string().max(4000).optional(),
  path: z.string().max(500),
  digest: z.string().max(100).optional(),
});

// POST /api/client-errors — a script error in a visitor's browser (see
// <ErrorReporter>). Goes through the same scrubbing and throttling as server
// errors; nothing about the visitor is kept.
export const POST = route(async (req) => {
  await enforceRateLimit("clientError", ipHash(req));
  const r = await parseJson(req, report);
  const err = Object.assign(new Error(r.message), { name: r.name, stack: r.stack ? `${r.name}: ${r.message}\n${r.stack}` : undefined });
  await reportError("browser", err, { path: r.path, digest: r.digest });
  return new NextResponse(null, { status: 204 });
});
