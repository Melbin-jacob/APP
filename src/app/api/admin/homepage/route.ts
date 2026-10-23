import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ApiError, badRequest, enforceRateLimit, ipHash, route } from "@/server/http";
import { MAX_SITE_IMAGE_BYTES, processHeroImage, removeSiteImage, replaceSiteImage } from "@/server/services/media";
import { getSetting, setSetting } from "@/server/settings";

const tooBig = () => new ApiError(413, "payload_too_large", "Images can be up to 12 MB");

// POST /api/admin/homepage — multipart `file`: new home page background picture.
export const POST = route(async (req) => {
  const admin = await requireRole("SUPER_ADMIN");
  await enforceRateLimit("upload", admin.id);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_SITE_IMAGE_BYTES + 64 * 1024) throw tooBig();
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    throw badRequest("Send the image as multipart/form-data");
  }
  if (!(file instanceof Blob) || file.size === 0) throw badRequest("Choose an image to upload");
  if (file.size > MAX_SITE_IMAGE_BYTES) throw tooBig();

  const image = await processHeroImage(Buffer.from(await file.arrayBuffer()));
  const url = await replaceSiteImage((await getSetting("home.heroImageUrl")) || null, image);
  await setSetting("home.heroImageUrl", url, admin.id);
  await audit({ actorId: admin.id, action: "settings.hero_image", entityType: "SiteSetting", entityId: "home.heroImageUrl", ipHash: ipHash(req), metadata: { url } });
  return NextResponse.json({ url }, { status: 201 });
});

// DELETE /api/admin/homepage — back to the built-in picture.
export const DELETE = route(async (req) => {
  const admin = await requireRole("SUPER_ADMIN");
  await removeSiteImage((await getSetting("home.heroImageUrl")) || null);
  await setSetting("home.heroImageUrl", "", admin.id);
  await audit({ actorId: admin.id, action: "settings.hero_image", entityType: "SiteSetting", entityId: "home.heroImageUrl", ipHash: ipHash(req), metadata: { url: null } });
  return NextResponse.json({ ok: true });
});
