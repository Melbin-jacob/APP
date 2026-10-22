import { db } from "@/lib/db";
import { notFound, route } from "@/server/http";

// GET /api/media/:id — uploaded images. Ids change on every upload, so
// responses are immutable and cacheable for a year.
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const id = (await params).id;
  if (!/^[a-z0-9]{20,40}$/.test(id)) throw notFound("Image");
  const file = await db.mediaFile.findUnique({ where: { id }, select: { bytes: true, contentType: true } });
  if (!file) throw notFound("Image");
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
});
