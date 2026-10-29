import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
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
export const processGalleryImage = (input: Buffer) => reencode(input, { width: 1600, height: 1600 }, 80);
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

// ─── Images linked from other sites ─────────────────────────────────────────
// Businesses can paste a link to a photo hosted elsewhere. We never show that
// link to visitors: loading it would hand every visitor's IP address to a
// third party before they've consented (cf. the Munich court's 2022 Google
// Fonts ruling). Instead the server fetches it once, re-encodes it like an
// upload (dropping EXIF/GPS) and serves its own copy.

const MAX_REMOTE_BYTES = 10 * 1024 * 1024;
const badLink = (message: string) => new ApiError(400, "image_link", message);

/** Private, loopback, link-local (cloud metadata) and other non-public addresses. */
export function isPrivateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Downloads an https image a business linked to, refusing anything that points inside our network. */
async function fetchRemoteImage(link: string): Promise<Buffer> {
  let url: URL;
  try { url = new URL(link); } catch { throw badLink("That image link isn't a valid web address."); }
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:") throw badLink("Image links must start with https://");
    const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true }).catch(() => []);
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) throw badLink("We couldn't load an image from that link.");
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { Accept: "image/*" } });
    } catch {
      throw badLink("We couldn't load an image from that link.");
    }
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) { url = new URL(next, url); continue; } // re-checked above
    if (!res.ok) throw badLink("We couldn't load an image from that link.");
    if (Number(res.headers.get("content-length") ?? 0) > MAX_REMOTE_BYTES) throw badLink("That image is larger than 10 MB.");
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_REMOTE_BYTES) throw badLink("That image is larger than 10 MB.");
    return bytes;
  }
  throw badLink("We couldn't load an image from that link.");
}

const isRemote = (url: string) => /^https?:\/\//i.test(url);

/**
 * Returns a URL safe to show visitors: our own media URL for a link to
 * another site (imported now), or the URL unchanged when it's already ours.
 */
export async function ownImageUrl(traderId: string, url: string, kind: "logo" | "cover" | "gallery"): Promise<string> {
  if (!isRemote(url)) return url;
  const bytes = await fetchRemoteImage(url);
  const image = await (kind === "logo" ? processLogo : kind === "cover" ? processHeroImage : processGalleryImage)(bytes);
  const file = await db.mediaFile.create({
    data: { traderId, contentType: image.contentType, bytes: image.bytes, width: image.width, height: image.height },
    select: { id: true },
  });
  return mediaUrl(file.id);
}

/** Deletes a business's stored images that its profile no longer uses. */
export async function pruneTraderMedia(traderId: string) {
  const t = await db.traderProfile.findUnique({ where: { id: traderId }, select: { logoUrl: true, coverImageUrl: true, gallery: { select: { url: true } } } });
  if (!t) return;
  const used = [t.logoUrl, t.coverImageUrl, ...t.gallery.map((g) => g.url)].map(mediaIdFromUrl).filter((id): id is string => !!id);
  await db.mediaFile.deleteMany({ where: { traderId, id: { notIn: used } } });
}
