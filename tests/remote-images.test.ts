import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => [{ address: host === "internal.example" ? "10.0.0.5" : "93.184.216.34" }],
}));
vi.mock("@/lib/db", () => ({ db: { mediaFile: { create: async () => ({ id: "m1" }) } } }));
const { isPrivateAddress, ownImageUrl } = await import("@/server/services/media");

afterEach(() => { vi.unstubAllGlobals(); });

describe("images linked from other sites", () => {
  it("recognises addresses inside a private network", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) expect(isPrivateAddress(ip)).toBe(false);
  });

  it("copies an outside photo into our own storage, and leaves our own URLs alone", async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#123456" } }).png().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(png), { status: 200, headers: { "content-type": "image/png" } })));
    expect(await ownImageUrl("t1", "https://photos.example/van.png", "gallery")).toBe("/api/media/m1");
    expect(await ownImageUrl("t1", "/api/media/abc", "gallery")).toBe("/api/media/abc");
  });

  it("refuses links into our network, redirects into it, and plain http", async () => {
    await expect(ownImageUrl("t1", "https://internal.example/x.png", "cover")).rejects.toMatchObject({ status: 400 });
    await expect(ownImageUrl("t1", "https://127.0.0.1/x.png", "cover")).rejects.toMatchObject({ status: 400 });
    await expect(ownImageUrl("t1", "http://photos.example/x.png", "cover")).rejects.toMatchObject({ status: 400 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://169.254.169.254/latest/meta-data" } })));
    await expect(ownImageUrl("t1", "https://photos.example/redirect.png", "cover")).rejects.toMatchObject({ status: 400 });
  });
});
