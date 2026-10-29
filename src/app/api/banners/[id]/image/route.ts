import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cached } from "@/lib/redis";
import { notFound, route } from "@/server/http";

const MAX_BYTES = 2 * 1024 * 1024;
const RASTER = /^image\/(png|jpeg|gif|webp|avif)$/; // no SVG: it can carry scripts

// GET /api/banners/:id/image — an image banner hosted on another site,
// fetched by our server. Visitors' browsers only ever talk to our domain, so
// an advertiser's host never sees their IP address without consent (cf. the
// Munich court's 2022 Google Fonts ruling). Our own images (/images/…,
// /api/media/…) are linked directly and never go through here.
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const id = (await params).id;
  const banner = await db.banner.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!banner?.imageUrl?.startsWith("https://")) throw notFound("Image");
  const image = await cached(`banner:img:${id}:${banner.imageUrl}`, 60 * 60, async () => {
    const res = await fetch(banner.imageUrl!, { signal: AbortSignal.timeout(5000), redirect: "error" });
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!res.ok || !RASTER.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length <= MAX_BYTES ? { type, data: bytes.toString("base64") } : null;
  });
  if (!image) throw notFound("Image");
  return new NextResponse(new Uint8Array(Buffer.from(image.data, "base64")), {
    headers: { "Content-Type": image.type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
});
