import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

// GET /api/health — liveness/readiness for the load balancer.
export async function GET() {
  const started = Date.now();
  const [pg, rd] = await Promise.allSettled([db.$queryRaw`SELECT 1`, redis.ping()]);
  const ok = pg.status === "fulfilled" && rd.status === "fulfilled";
  return NextResponse.json(
    { ok, postgres: pg.status === "fulfilled", redis: rd.status === "fulfilled", latencyMs: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
