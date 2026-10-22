import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { avatarColour, initials } from "@/lib/avatar";
import { mediaIdFromUrl, processLogo } from "@/server/services/media";
import { quoteInput } from "@/server/services/quotes";

describe("business initials", () => {
  it.each([
    ["Appliance Medic", "AM"],
    ["The Plumbing Co", "P"], // "The" and "Co" are skipped
    ["A & B Roofing Ltd.", "BR"],
    ["4 Seasons Heating", "4S"],
    ["électricité Dubois", "ÉD"],
    ["Zed", "Z"],
    ["  ", "?"],
  ])("%s → %s", (name, expected) => expect(initials(name)).toBe(expected));

  it("gives the same business the same colour every time", () => {
    expect(avatarColour("Appliance Medic")).toBe(avatarColour("Appliance Medic"));
    const colours = new Set(["Appliance Medic", "Central Plumbing", "Compass Plumbing", "Eagle Heating", "Windsor Glass", "Tecumseh Towing"].map(avatarColour));
    expect(colours.size).toBeGreaterThan(2);
  });
});

describe("quote request validation", () => {
  const valid = {
    name: "Pat Lee", phone: "+1 519-555-0100", addressLine: "123 Main St", city: "Windsor", postcode: "N9A 1A1",
    description: "Kitchen sink is leaking under the cabinet.", contactTimes: ["WEEKDAY_EVENING"], consent: true,
  };
  it("accepts a complete request, email optional", () => {
    expect(quoteInput.safeParse(valid).success).toBe(true);
    expect(quoteInput.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(quoteInput.safeParse({ ...valid, email: "pat@example.com" }).success).toBe(true);
  });
  it.each([
    ["no consent", { consent: false }],
    ["no contact time", { contactTimes: [] }],
    ["unknown contact time", { contactTimes: ["MIDNIGHT"] }],
    ["too-short description", { description: "fix it" }],
    ["bad phone", { phone: "call me" }],
    ["bad email", { email: "nope" }],
  ])("rejects %s", (_label, patch) => expect(quoteInput.safeParse({ ...valid, ...patch }).success).toBe(false));
});

describe("logo processing", () => {
  it("re-encodes an upload as WebP, at most 512 px, without metadata", async () => {
    const png = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#4caf2f" } })
      .withMetadata({ exif: { IFD0: { Copyright: "secret", ImageDescription: "gps here" } } })
      .png().toBuffer();
    const out = await processLogo(png);
    expect(out.contentType).toBe("image/webp");
    expect([out.width, out.height]).toEqual([512, 256]);
    const meta = await sharp(out.bytes).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });
  it("refuses SVG and non-images", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
    await expect(processLogo(svg)).rejects.toMatchObject({ status: 415 });
    await expect(processLogo(Buffer.from("not an image"))).rejects.toMatchObject({ status: 415 });
  });
  it("only treats our own media URLs as uploaded files", () => {
    expect(mediaIdFromUrl("/api/media/cm1abc2def3ghi4jkl5mno6p")).toBe("cm1abc2def3ghi4jkl5mno6p");
    expect(mediaIdFromUrl("https://evil.example/api/media/x")).toBeNull();
    expect(mediaIdFromUrl(null)).toBeNull();
  });
});
