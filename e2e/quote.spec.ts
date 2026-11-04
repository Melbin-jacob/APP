import { expect, test } from "@playwright/test";
import { waitForMail } from "./mail";
import { state, uniqueEmail } from "./fixtures";

test("a visitor requests a quote from an unclaimed listing, and our team is emailed", async ({ page }) => {
  const { slug, businessName } = state().forQuote;
  const email = uniqueEmail("quote");
  await page.goto(`/traders/${slug}/quote`);
  await page.locator("#q-name").fill("Quinn Quote");
  await page.locator("#q-phone").fill("519-555-0199");
  await page.locator("#q-email").fill(email);
  await page.locator("#q-address").fill("350 City Hall Square W");
  await page.locator("#q-city").fill("Windsor");
  await page.locator("#q-postcode").fill("N9A 6S1");
  await page.locator("#q-desc").fill("The kitchen tap has been dripping for a week and the shut-off valve is stiff.");
  await page.getByText("Weekday mornings").click();
  await page.locator("form input[type=checkbox][required]").check();
  await page.getByRole("button", { name: "Send quote request" }).click();
  await expect(page.getByRole("status")).toContainText(/Our team will pass your request on/);
  await waitForMail("support@gettradepros.com", new RegExp(`Quote request.*${businessName.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});
