import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Edge middleware: per-request CSP nonce + coarse route gating. Fine-grained
// RBAC (and ban checks) happen again server-side in requireRole(); this layer
// only keeps anonymous users out of private areas quickly.

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

function csp(nonce: string, https: boolean) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    // Only behind TLS: on plain-http localhost it would rewrite assets to https and break them.
    ...(https && !dev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/account")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    if (!token) return NextResponse.redirect(login);
    if (pathname.startsWith("/admin") && !ADMIN_ROLES.has(token.role as string)) {
      return NextResponse.rewrite(new URL("/404", req.url));
    }
    // /dashboard checks the role itself, from the database: the token's role is
    // stale after a listing claim is approved, until the next sign-in.
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const https = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")) === "https";
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp(nonce, https));
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp(nonce, https));
  return res;
}

export const config = {
  // Skip static assets and API routes (APIs return JSON, not documents).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/).*)"],
};
