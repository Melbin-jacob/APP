import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/banners/:id/frame — the document loaded into a SCRIPT banner's
// iframe. The iframe is sandboxed without allow-same-origin, so this runs in
// an opaque origin: third-party ad code gets its own relaxed CSP here but can
// never touch the main site's cookies, storage or DOM.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const banner = await db.banner.findFirst({
    where: { id: (await params).id, kind: "SCRIPT", isActive: true },
    select: { scriptHtml: true },
  });
  if (!banner?.scriptHtml) return new NextResponse("", { status: 404 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body>${banner.scriptHtml}</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "public, max-age=60",
    },
  });
}
