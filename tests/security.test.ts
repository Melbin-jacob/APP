import { describe, expect, it } from "vitest";
import { hashToken, randomToken, safeEqual } from "@/lib/crypto";
import { plainText, safeUrl, slugify } from "@/lib/sanitize";
import { reviewRequestEmail } from "@/server/email/templates";

describe("sanitize", () => {
  it("strips markup from user text", () => {
    expect(plainText(`<img src=x onerror=alert(1)>Hello <b>there</b><script>x()</script>`)).toBe("Hello there");
  });
  it("only allows http(s) URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("//evil.com")).toBeNull();
    expect(safeUrl("https://ok.example/a")).toBe("https://ok.example/a");
  });
  it("slugifies", () => expect(slugify("Joe's Plumbing & Heating!")).toBe("joe-s-plumbing-heating"));
});

describe("tokens", () => {
  it("are 256-bit url-safe and hashed with a pepper", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashToken(t, "a".repeat(32))).not.toBe(hashToken(t, "b".repeat(32)));
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});

describe("review request email", () => {
  const mail = reviewRequestEmail({
    businessName: `Bob's <script>"Pipes"</script>`,
    customerName: "<img>",
    reviewUrl: "https://app.test/review?token=abc",
    formAction: "https://app.test/api/reviews/email",
    token: "abc",
    expiresAt: new Date("2026-11-05"),
    unsubscribeUrl: "https://app.test/unsubscribe?t=abc.def",
  });
  it("uses the required subject line", () => expect(mail.subject).toBe(`How was your service with Bob's <script>"Pipes"</script>?`));
  it("escapes every interpolated value in HTML", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
  it("carries an unsubscribe link and the sender's mailing address (CAN-SPAM / CASL)", () => {
    expect(mail.html).toContain("https://app.test/unsubscribe?t=abc.def");
    expect(mail.text).toContain("https://app.test/unsubscribe?t=abc.def");
    expect(mail.html).toMatch(/HomeServices Direct Inc\./);
  });
  it("thanks the customer and contains the review form: five star ratings, comment box, submit", () => {
    expect(mail.html).toContain("Thank you for choosing Bob&#39;s &lt;script&gt;");
    expect(mail.html).toContain('<form action="https://app.test/api/reviews/email" method="post"');
    expect(mail.html).toContain('<input type="hidden" name="token" value="abc">');
    for (let n = 1; n <= 5; n++) expect(mail.html).toContain(`name="rating" value="${n}"`);
    expect(mail.html).toContain('<textarea name="comment"');
    expect(mail.html).toContain(">Submit review</button>");
  });
  it("links to the same form on the web for mail apps that strip forms", () => {
    expect(mail.html).toContain('href="https://app.test/review?token=abc"');
    expect(mail.text).toContain("https://app.test/review?token=abc");
  });
});
