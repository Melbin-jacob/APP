import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { openBytes, sealBytes } from "@/lib/secret-box";
import { processClaimDocument, safeFileName } from "@/server/services/claim-documents";

const pdf = (body: string) => Buffer.from(`%PDF-1.7\n1 0 obj\n<< /Type /Catalog ${body} >>\nendobj\n%%EOF\n`, "latin1");

describe("claim documents", () => {
  it("encrypts and decrypts files, and detects tampering", () => {
    const plain = Buffer.from("passport scan");
    const sealed = sealBytes(plain);
    expect(sealed.includes(plain)).toBe(false);
    expect(openBytes(sealed).equals(plain)).toBe(true);
    sealed[sealed.length - 1] ^= 1;
    expect(() => openBytes(sealed)).toThrow();
  });

  it("accepts a plain PDF as is", async () => {
    const doc = await processClaimDocument(pdf("/Pages 2 0 R"), "Articles of Incorporation.PDF");
    expect(doc).toMatchObject({ contentType: "application/pdf", fileName: "Articles of Incorporation.pdf" });
  });

  it("refuses PDFs with scripts or attachments, but not stream bytes that look like them", async () => {
    await expect(processClaimDocument(pdf("/OpenAction << /S /JavaScript /JS (app.alert(1)) >>"), "x.pdf")).rejects.toMatchObject({ status: 415 });
    await expect(processClaimDocument(pdf("/Names << /EmbeddedFiles 3 0 R >> /EmbeddedFile"), "x.pdf")).rejects.toMatchObject({ status: 415 });
    const withStream = Buffer.from("%PDF-1.7\n4 0 obj\n<< /Length 9 >>\nstream\n/JS junk\nendstream\nendobj\n", "latin1");
    await expect(processClaimDocument(withStream, "scan.pdf")).resolves.toMatchObject({ contentType: "application/pdf" });
  });

  it("re-encodes photos as JPEG without their metadata", async () => {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#336699" } })
      .withMetadata({ exif: { IFD0: { Copyright: "secret-gps-owner" } } }).png().toBuffer();
    const doc = await processClaimDocument(png, "../../etc/ID card.png");
    expect(doc.contentType).toBe("image/jpeg");
    expect(doc.fileName).toBe("ID card.jpg");
    expect((await sharp(doc.bytes).metadata()).exif).toBeUndefined();
    expect(doc.bytes.includes(Buffer.from("secret-gps-owner"))).toBe(false);
  });

  it("refuses anything else", async () => {
    await expect(processClaimDocument(Buffer.from("<svg onload=alert(1)>"), "id.svg")).rejects.toMatchObject({ status: 415 });
    await expect(processClaimDocument(Buffer.alloc(0), "empty.pdf")).rejects.toMatchObject({ status: 415 });
    await expect(processClaimDocument(Buffer.alloc(10 * 1024 * 1024 + 1), "big.pdf")).rejects.toMatchObject({ status: 413 });
  });

  it("makes safe file names", () => {
    expect(safeFileName('a"<b>.exe', "pdf")).toBe("ab.pdf");
    expect(safeFileName("", "jpg")).toBe("document.jpg");
  });
});
