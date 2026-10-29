import type { NextConfig } from "next";

// Baseline security headers (OWASP A05). The CSP is applied per-request in
// middleware so it can carry a nonce; everything static lives here.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=(), serial=(), browsing-topics=(), interest-cohort=()",
  },
  // Isolates our window from cross-origin popups (e.g. ad click-throughs) — blocks tab-nabbing and XS-leaks.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// Applied to every route except the sandboxed ad-frame document, which sets
// its own looser policy and must stay frameable by our pages.
const NOT_AD_FRAME = "/((?!api/banners/[^/]+/frame).*)";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: NOT_AD_FRAME, headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      // JSON APIs never render HTML; lock them down completely. (Pages get a
      // per-request nonce CSP from middleware; claim documents set their own.)
      {
        source: "/api/((?!banners/[^/]+/frame|admin/claims/[^/]+/documents/).*)",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" }],
      },
    ];
  },
};

export default nextConfig;
