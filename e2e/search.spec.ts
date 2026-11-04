import { expect, test } from "@playwright/test";

test.describe("finding a pro", () => {
  test("search from the home page, sort, and open a business", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Plumber, Electrician, Painter…").fill("plumb");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search\?/);
    await expect(page.getByText(/\d+ professionals? found/)).toBeVisible();

    await page.getByLabel("Sort by").selectOption("name");
    await expect(page).toHaveURL(/sort=name/);

    const first = page.locator("article h3, article h2").first();
    const name = (await first.innerText()).trim();
    await first.click();
    await expect(page).toHaveURL(/\/traders\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    // Structured data for search engines is on the page.
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().innerHTML());
    expect(ld.name).toBe(name);
  });

  test("browse a category", async ({ page }) => {
    await page.goto("/categories");
    await page.getByRole("link", { name: /Plumbing/ }).first().click();
    await expect(page).toHaveURL(/category=plumbing/);
    await expect(page.getByText(/\d+ professionals? found/)).toBeVisible();
  });

  test("the Get help assistant asks for a place, then finds pros", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Get help" }).click();
    await page.locator("#chat-input").fill("my kitchen tap is leaking");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Which town or postal code/)).toBeVisible();
    await page.locator("#chat-input").fill("Windsor");
    await page.keyboard.press("Enter");
    await expect(page.locator("section[role=dialog] li").first()).toBeVisible();
    await expect(page.locator("section[role=dialog]").getByRole("link", { name: "Get a quote" }).first()).toBeVisible();
  });

  test("search engines get a sitemap and robots.txt", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/traders/");
  });
});
