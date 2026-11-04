import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { waitForMail } from "./mail";
import { registerCustomer, signIn, signInAsAdmin, state, uniqueEmail, E2E } from "./fixtures";

// One owner's journey, in order: claim a listing with proof documents, get
// approved by staff, ask a customer for a review, the customer leaves it from
// the email, and it shows on the business page.
test.describe.serial("claim a listing, then collect a review", () => {
  const owner = uniqueEmail("owner");
  const customer = uniqueEmail("reviewer");
  const comment = `Fixed our leak quickly and left everything tidy (${Date.now().toString(36)}).`;

  test("an owner claims the listing with registration and photo ID", async ({ page }) => {
    const { slug } = state().forClaim;
    await registerCustomer(page, owner, "Olive Owner");
    await page.goto(`/traders/${slug}/claim`);
    await page.locator("#c-title").fill("Owner");
    await page.locator("#c-phone").fill("519-555-0142");
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
    const photo = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#dfe8f1" } }).png().toBuffer();
    await page.locator("#c-doc-REGISTRATION").setInputFiles({ name: "registration.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.locator("#c-doc-ID_PROOF").setInputFiles({ name: "licence.png", mimeType: "image/png", buffer: photo });
    await page.locator("form input[type=checkbox]").last().check();
    await page.getByRole("button", { name: "Submit claim" }).click();
    await expect(page.getByText("Claim submitted")).toBeVisible();
  });

  test("staff check the documents and approve; the documents are deleted", async ({ page }) => {
    await signInAsAdmin(page, "/admin/claims");
    await page.goto("/admin/claims");
    const card = page.locator("article", { hasText: owner });
    await expect(card.getByRole("link", { name: /Company registration/ })).toBeVisible();
    const doc = await page.request.get((await card.getByRole("link", { name: /Photo ID/ }).getAttribute("href"))!);
    expect(doc.status()).toBe(200);
    expect(doc.headers()["content-type"]).toBe("image/jpeg");
    page.once("dialog", (d) => d.accept());
    await card.getByRole("button", { name: "Approve" }).click();
    await page.getByLabel("Show claims").selectOption("APPROVED");
    await expect(page.locator("article", { hasText: owner })).toContainText(/checked; deleted/);
    await waitForMail(owner, /You now manage/);
  });

  test("the owner asks a customer for a review", async ({ page }) => {
    await signIn(page, owner, E2E.password, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByPlaceholder("customer@example.com").fill(customer);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Review request sent/)).toBeVisible();
  });

  test("the customer reviews from the email, and it shows on the profile", async ({ page }) => {
    const mail = await waitForMail(customer, new RegExp(`How was your service with`));
    const link = mail.match(/https?:\/\/[^"\s<]+\/review\?token=[^"\s<&]+/)?.[0];
    expect(link).toBeTruthy();
    await page.goto(new URL(link!).pathname + new URL(link!).search);
    await page.locator("label", { hasText: "5 stars" }).click();
    await page.locator("#comment").fill(comment);
    const shownName = page.getByLabel("Name shown with your review");
    if (await shownName.isVisible()) await shownName.fill("Riley R.");
    await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByText(/Thank you for your review/)).toBeVisible();
    await page.goto(`/traders/${state().forClaim.slug}`);
    await expect(page.getByText(comment)).toBeVisible();
  });
});
