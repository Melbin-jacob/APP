import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { ipHash, notFound, route } from "@/server/http";
import { readClaimDocument } from "@/server/services/claim-documents";

// GET /api/admin/claims/:id/documents/:documentId — a claim's proof document
// (registration or photo ID), decrypted for staff only. Every view is audited.
export const GET = route<{ params: Promise<{ id: string; documentId: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { id, documentId } = await params;
  const doc = await readClaimDocument(id, documentId);
  if (!doc) throw notFound("Document");
  await audit({ actorId: admin.id, action: "listing.claim.document.view", entityType: "ListingClaim", entityId: id, metadata: { kind: doc.kind }, ipHash: ipHash(req) });
  const headers: Record<string, string> = {
    "Content-Type": doc.contentType,
    "Content-Length": String(doc.bytes.length),
    "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  // Images can't run code, so lock them down fully. PDFs open in the browser's
  // own sandboxed viewer, which needs object-src (a CSP sandbox would block it).
  headers["Content-Security-Policy"] = doc.contentType === "application/pdf"
    ? "default-src 'none'; object-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox";
  return new NextResponse(new Uint8Array(doc.bytes), { headers });
});
