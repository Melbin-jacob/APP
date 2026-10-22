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

/** Best-effort client IP. Trust X-Forwarded-For only as set by our own edge (ALB/Vercel). */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
}

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

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Body must be valid JSON");
  }
  return schema.parse(body);
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Uniform error envelope: { error: { code, message, issues? } }. Never leaks stack traces. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, {
          status: err.status,
          headers: err.headers,
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
