import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, signIn, signInAsAdmin, state } from "./fixtures";

// Automatic WCAG 2.1 A/AA check of every kind of page. Any violation fails
// the build, so new pages and changes stay accessible.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  expect(summary, `Accessibility problems on ${path}`).toEqual([]);
}

const PUBLIC = [
  "/", "/categories", "/search?q=plumb", "/search?category=electrical", "/contact", "/login", "/register",
  "/register?type=trader", "/privacy", "/terms", "/legal", "/legal/cookies", "/legal/disclaimer", "/legal/accessibility",
  "/legal/security", "/legal/copyright", "/legal/privacy-rights", "/legal/privacy-choices", "/this-page-does-not-exist",
];

test.describe("accessibility", () => {
  for (const path of PUBLIC) test(`public: ${path}`, async ({ page }) => scan(page, path));

  test("public: business profile, quote and claim pages", async ({ page }) => {
    const { slug } = state().forQuote;
    for (const p of [`/traders/${slug}`, `/traders/${slug}/quote`, `/traders/${slug}/claim`]) await scan(page, p);
  });

  test("public: phone layout with the menu and chat open", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await scan(page, "/");
    await page.getByRole("button", { name: "Menu" }).click();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((v) => v.id)).toEqual([]);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: "Get help" }).click();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((v) => v.id)).toEqual([]);
    await ctx.close();
  });

  test("customer account pages", async ({ page }) => {
    await signIn(page, E2E.customer.email, E2E.customer.password, "/account");
    await page.waitForURL(/\/account/);
    for (const p of ["/account", "/account/security"]) await scan(page, p);
  });

  test("business dashboard pages", async ({ page }) => {
    await signIn(page, "business@gettradepros.local", E2E.customer.password, "/dashboard");
    await page.waitForURL(/\/dashboard/);
    for (const p of ["/dashboard", "/dashboard/profile"]) await scan(page, p);
  });

  test("ops console pages", async ({ page }) => {
    await signInAsAdmin(page, "/admin");
    for (const p of ["/admin", "/admin/traders", "/admin/claims", "/admin/quotes", "/admin/users", "/admin/reviews", "/admin/banners", "/admin/homepage", "/admin/audit", "/admin/incidents"]) {
      await scan(page, p);
    }
  });
});
