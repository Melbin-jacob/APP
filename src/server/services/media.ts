import sharp from "sharp";
import { db } from "@/lib/db";
import { ApiError } from "@/server/http";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_SITE_IMAGE_BYTES = 12 * 1024 * 1024; // full-width photos straight from a camera
// Raster formats only. SVG can carry scripts, so it's refused rather than trusted.
const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"]);

const MEDIA_PATH = /^\/api\/media\/([a-z0-9]+)$/;
export const mediaUrl = (id: string) => `/api/media/${id}`;
export const mediaIdFromUrl = (url: string | null | undefined) => url?.match(MEDIA_PATH)?.[1] ?? null;

/**
 * Decodes an uploaded image and re-encodes it as a WebP within `size` px.
 * Whatever was uploaded (metadata, GPS tags, polyglot payloads) never reaches
 * visitors: only freshly encoded pixels are stored.
 */
async function reencode(input: Buffer, size: { width: number; height: number }, quality: number) {
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: 50_000_000 }).metadata()).format;
  } catch {
    throw new ApiError(415, "unsupported_image", "That file isn't an image we can read. Use a PNG, JPEG or WebP.");
  }
  if (!format || !ACCEPTED.has(format)) {
    throw new ApiError(415, "unsupported_image", "Use a PNG, JPEG or WebP image.");
  }
  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, animated: false })
    .rotate() // honour EXIF orientation before it's stripped
    .resize(size.width, size.height, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90 })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height, contentType: "image/webp" };
}

export const processLogo = (input: Buffer) => reencode(input, { width: 512, height: 512 }, 85);
// Home page background: wide enough for large screens, still a few hundred KB.
export const processHeroImage = (input: Buffer) => reencode(input, { width: 2400, height: 1600 }, 78);

/** Stores a site-wide image (not tied to a business) and removes the one it replaces. */
export async function replaceSiteImage(currentUrl: string | null, image: Awaited<ReturnType<typeof reencode>>) {
  const oldId = mediaIdFromUrl(currentUrl);
  return db.$transaction(async (tx) => {
    const file = await tx.mediaFile.create({
      data: { contentType: image.contentType, bytes: image.bytes, width: image.width, height: image.height },
      select: { id: true },
    });
    if (oldId) await tx.mediaFile.deleteMany({ where: { id: oldId, traderId: null } });
    return mediaUrl(file.id);
  });
}

export async function removeSiteImage(url: string | null) {
  const id = mediaIdFromUrl(url);
  if (id) await db.mediaFile.deleteMany({ where: { id, traderId: null } });
}

/** Stores a new logo for the business and removes the one it replaces. */
export async function replaceLogo(traderId: string, currentLogoUrl: string | null, image: Awaited<ReturnType<typeof processLogo>>) {
  const oldId = mediaIdFromUrl(currentLogoUrl);
  return db.$transaction(async (tx) => {
    const file = await tx.mediaFile.create({
      data: { traderId, contentType: image.contentType, bytes: image.bytes, width: image.width, height: image.height },
      select: { id: true },
    });
    await tx.traderProfile.update({ where: { id: traderId }, data: { logoUrl: mediaUrl(file.id) } });
    if (oldId) await tx.mediaFile.deleteMany({ where: { id: oldId, traderId } });
    return mediaUrl(file.id);
  });
}

export async function removeLogo(traderId: string, currentLogoUrl: string | null) {
  const oldId = mediaIdFromUrl(currentLogoUrl);
  await db.$transaction([
    db.traderProfile.update({ where: { id: traderId }, data: { logoUrl: null } }),
    ...(oldId ? [db.mediaFile.deleteMany({ where: { id: oldId, traderId } })] : []),
  ]);
}
