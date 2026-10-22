import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ApiError, badRequest, enforceRateLimit, route } from "@/server/http";
import { MAX_UPLOAD_BYTES, processLogo, removeLogo, replaceLogo } from "@/server/services/media";
import { invalidateTrader, myTraderProfile } from "@/server/services/traders";

const tooBig = () => new ApiError(413, "payload_too_large", "Images can be up to 5 MB");

// POST /api/trader/logo — multipart form with a `file` field. Replaces the logo.
export const POST = route(async (req) => {
  const user = await requireRole("TRADER");
  await enforceRateLimit("upload", user.id);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) throw tooBig();
  const profile = await myTraderProfile(user.id);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    throw badRequest("Send the image as multipart/form-data");
  }
  if (!(file instanceof Blob) || file.size === 0) throw badRequest("Choose an image to upload");
  if (file.size > MAX_UPLOAD_BYTES) throw tooBig();

  const image = await processLogo(Buffer.from(await file.arrayBuffer()));
  const logoUrl = await replaceLogo(profile.id, profile.logoUrl, image);
  await audit({ actorId: user.id, action: "trader.logo.upload", entityType: "TraderProfile", entityId: profile.id });
  await invalidateTrader(profile.slug);
  return NextResponse.json({ logoUrl }, { status: 201 });
});

// DELETE /api/trader/logo — back to the name-based picture.
export const DELETE = route(async () => {
  const user = await requireRole("TRADER");
  const profile = await myTraderProfile(user.id);
  await removeLogo(profile.id, profile.logoUrl);
  await invalidateTrader(profile.slug);
  return NextResponse.json({ ok: true });
});
