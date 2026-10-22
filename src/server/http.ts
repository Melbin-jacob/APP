import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { rateLimit, type RATE_LIMITS } from "@/lib/rate-limit";
import { anonymise } from "@/lib/crypto";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public headers?: Record<string, string>,
  ) {
    super(message ?? code);
  }
}

export const badRequest = (msg = "Invalid request") => new ApiError(400, "bad_request", msg);
export const unauthorized = () => new ApiError(401, "unauthorized", "Sign in required");
export const forbidden = () => new ApiError(403, "forbidden", "Not allowed");
export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found`);
export const conflict = (msg: string) => new ApiError(409, "conflict", msg);

/**
 * Client IP for rate limiting and abuse logs.
 *
 * Clients can send any X-Forwarded-For they like, so its leftmost entry is
 * attacker-controlled; trusting it would let one client dodge rate limits by
 * rotating fake IPs. Prefer headers only the hosting platform can set, then
 * the rightmost X-Forwarded-For entry, which our own proxy (ALB / CloudFront /
 * Vercel) appended.
 */
export function clientIpFrom(get: (name: string) => string | null | undefined): string {
  for (const name of ["x-vercel-forwarded-for", "cf-connecting-ip", "fly-client-ip", "x-real-ip"]) {
    const v = get(name)?.split(",")[0]?.trim();
    if (v) return v;
  }
  const chain = get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return chain?.at(-1) ?? "0.0.0.0";
}

export const clientIp = (req: NextRequest) => clientIpFrom((n) => req.headers.get(n));

export function ipHash(req: NextRequest) {
  return anonymise(clientIp(req), process.env.NEXTAUTH_SECRET ?? "dev");
}

export async function enforceRateLimit(policy: keyof typeof RATE_LIMITS, identifier: string) {
  const result = await rateLimit(policy, identifier);
  if (!result.ok) {
    throw new ApiError(429, "rate_limited", "Too many requests, please try again later", {
      "Retry-After": String(result.retryAfterSeconds),
    });
  }
}

/**
 * CSRF defence for cookie-authenticated mutations: require a same-origin
 * Origin header (plus SameSite=Lax cookies set by NextAuth).
 */
export function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.APP_URL ?? req.nextUrl.origin).origin;
  if (!origin || origin !== expected) throw new ApiError(403, "csrf", "Cross-site request blocked");
}

const MAX_BODY_BYTES = 64 * 1024; // every JSON API body is small; refuse anything bigger

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", "Request body too large");
  let body: unknown;
  try {
    const text = await req.text();
    // Content-Length can be absent (chunked) or wrong; check what actually arrived.
    if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", "Request body too large");
    body = JSON.parse(text);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw badRequest("Body must be valid JSON");
  }
  return schema.parse(body);
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Uniform error envelope: { error: { code, message, issues? } }. Never leaks stack traces.
 * `sameOrigin: false` is only for endpoints authorised by a signed token rather
 * than a cookie (e.g. one-click unsubscribe POSTed by mail providers).
 */
export function route<C = unknown>(handler: Handler<C>, opts: { sameOrigin?: boolean } = {}): Handler<C> {
  return async (req, ctx) => {
    try {
      if (opts.sameOrigin !== false) assertSameOrigin(req);
      const res = await handler(req, ctx);
      // API responses default to uncacheable: most carry personal or per-visitor data.
      if (!res.headers.has("Cache-Control")) res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, {
          status: err.status,
          headers: { "Cache-Control": "no-store", ...err.headers },
        });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "validation_error",
              message: "Some fields are invalid",
              issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
            },
          },
          { status: 422 },
        );
      }
      console.error("[api] unhandled", err);
      return NextResponse.json({ error: { code: "internal", message: "Something went wrong" } }, { status: 500 });
    }
  };
}
