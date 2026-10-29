import sharp from "sharp";
import type { ClaimDocumentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { openBytes, sealBytes } from "@/lib/secret-box";
import { ApiError } from "@/server/http";

// Proof of ownership sent with a listing claim: a company registration
// document and the claimant's photo ID. Restricted data, so:
// - images are decoded and re-encoded (drops EXIF/GPS and anything hidden in the file);
// - PDFs are kept as uploaded but refused if they carry scripts, launch actions or attachments;
// - everything is encrypted at rest and only staff can read it (audited);
// - documents are deleted as soon as the claim is approved or rejected
//   (decideClaim), with a retention sweep as a safety net.

export const MAX_CLAIM_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const CLAIM_DOCUMENT_KINDS = ["REGISTRATION", "ID_PROOF"] as const satisfies readonly ClaimDocumentKind[];

const IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);
// PDF features that can run code or smuggle files; a scan or export never needs
// them. Checked outside stream data, where random bytes would give false alarms.
// Best effort (compressed object streams can hide them), which is why staff
// open PDFs in the browser's sandboxed viewer rather than a desktop reader.
const ACTIVE_PDF = /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA)\b/;
const STREAM_DATA = /stream\r?\n[\s\S]*?endstream/g;

const unsupported = () =>
  new ApiError(415, "unsupported_document", "Upload a PDF or a photo (JPEG, PNG or WebP) of the document.");

export type ProcessedDocument = { fileName: string; contentType: "image/jpeg" | "application/pdf"; bytes: Buffer };

/** Turns an uploaded file name into a safe, short one with the right extension. */
export function safeFileName(name: string, ext: "pdf" | "jpg") {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .slice(0, 80);
  return `${base || "document"}.${ext}`;
}

export async function processClaimDocument(input: Buffer, name: string): Promise<ProcessedDocument> {
  if (input.length === 0) throw unsupported();
  if (input.length > MAX_CLAIM_DOCUMENT_BYTES) throw new ApiError(413, "payload_too_large", "Each document can be up to 10 MB.");

  if (input.subarray(0, 5).toString("latin1") === "%PDF-") {
    if (ACTIVE_PDF.test(input.toString("latin1").replace(STREAM_DATA, ""))) {
      throw new ApiError(415, "unsupported_document", "That PDF contains scripts or attachments. Upload a plain scan or a photo instead.");
    }
    return { fileName: safeFileName(name, "pdf"), contentType: "application/pdf", bytes: input };
  }

  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: 80_000_000 }).metadata()).format;
  } catch {
    throw unsupported();
  }
  if (!format || !IMAGE_FORMATS.has(format)) throw unsupported();
  const bytes = await sharp(input, { limitInputPixels: 80_000_000, animated: false })
    .rotate() // honour EXIF orientation before it's stripped
    .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  return { fileName: safeFileName(name, "jpg"), contentType: "image/jpeg", bytes };
}

export const sealDocument = (doc: ProcessedDocument) => ({
  fileName: doc.fileName,
  contentType: doc.contentType,
  size: doc.bytes.length,
  sealed: new Uint8Array(sealBytes(doc.bytes)),
});

/** Decrypted document for the staff viewer. */
export async function readClaimDocument(claimId: string, documentId: string) {
  const doc = await db.claimDocument.findFirst({ where: { id: documentId, claimId } });
  if (!doc) return null;
  return { ...doc, bytes: openBytes(Buffer.from(doc.sealed)) };
}
