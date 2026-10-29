import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { ApiError, badRequest, enforceRateLimit, ipHash, route } from "@/server/http";
import { CLAIM_DOCUMENT_KINDS, MAX_CLAIM_DOCUMENT_BYTES, processClaimDocument } from "@/server/services/claim-documents";
import { claimInput, type ClaimDocuments, submitClaim } from "@/server/services/claims";

const tooBig = () => new ApiError(413, "payload_too_large", "Each document can be up to 10 MB.");

// POST /api/traders/:slug/claim — a signed-in user asks to manage an unclaimed
// listing. Multipart form: the claim fields plus two files, `REGISTRATION`
// (company registration) and `ID_PROOF` (photo ID), to prove ownership.
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  await enforceRateLimit("listingClaim", user.id);
  if (Number(req.headers.get("content-length") ?? 0) > 2 * MAX_CLAIM_DOCUMENT_BYTES + 64 * 1024) throw tooBig();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Send the claim as multipart/form-data");
  }
  const text = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const input = claimInput.parse({
    contactName: text("contactName"), jobTitle: text("jobTitle"), phone: text("phone"),
    message: text("message")?.trim() || undefined, authorised: text("authorised") === "true",
  });

  const documents = {} as ClaimDocuments;
  for (const kind of CLAIM_DOCUMENT_KINDS) {
    const file = form.get(kind);
    if (!(file instanceof File) || file.size === 0) {
      throw badRequest(kind === "REGISTRATION" ? "Upload your company registration document" : "Upload your photo ID");
    }
    if (file.size > MAX_CLAIM_DOCUMENT_BYTES) throw tooBig();
    documents[kind] = await processClaimDocument(Buffer.from(await file.arrayBuffer()), file.name);
  }

  await submitClaim((await params).slug, user, input, documents, ipHash(req));
  return NextResponse.json({ ok: true }, { status: 201 });
});
