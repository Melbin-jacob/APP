import { expect, test } from "@playwright/test";
import { E2E, registerCustomer, signIn, uniqueEmail } from "./fixtures";

test.describe("accounts", () => {
  test("a wrong password is refused", async ({ page }) => {
    await signIn(page, E2E.customer.email, "not-the-password-1");
    await expect(page.locator("form [role=alert]")).toContainText(/incorrect/i);
  });

  test("a customer signs in, sees their account and signs out", async ({ page }) => {
    await signIn(page, E2E.customer.email, E2E.customer.password, "/account");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page.getByRole("link", { name: "Login/Register" }).first()).toBeVisible();
  });

  test("a new customer registers", async ({ page }) => {
    await registerCustomer(page, uniqueEmail("signup"));
  });

  test("under-18s can't create an account", async ({ page }) => {
    await page.goto("/register");
    await page.locator("#name").fill("Young Tester");
    await page.locator("#email").fill(uniqueEmail("young"));
    await page.locator("#password").fill(E2E.password);
    await page.selectOption("select[name=birthMonth]", "1");
    await page.selectOption("select[name=birthYear]", String(new Date().getFullYear() - 12));
    await page.locator("input[name=acceptTerms]").check();
    await page.locator("form button[type=submit]").last().click();
    await expect(page.getByRole("heading", { name: /can't create an account/ })).toBeVisible();
  });
});
