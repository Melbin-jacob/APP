import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { currentStep, totpAt } from "../src/lib/totp";

export const E2E = {
  password: "E2e-Password-123",
  adminEmail: "e2e-admin@gettradepros.local",
  // Fixed so the tests can produce codes; the account exists only in test databases.
  adminTotpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  customer: { email: "customer@gettradepros.local", password: "ChangeMe-123456" },
  stateFile: path.join(process.cwd(), "e2e", ".state.json"),
};

type Listing = { slug: string; businessName: string };
export const state = () => JSON.parse(fs.readFileSync(E2E.stateFile, "utf8")) as { forQuote: Listing; forClaim: Listing };

/** A unique, valid email per test run. */
export const uniqueEmail = (label: string) => `e2e-${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;

let lastStep = 0;
/** A fresh authenticator code (the app refuses a code that was already used). */
export async function nextTotp() {
  let step = currentStep();
  if (step <= lastStep) {
    await new Promise((r) => setTimeout(r, (lastStep + 1) * 30_000 - Date.now() + 200));
    step = currentStep();
  }
  lastStep = step;
  return totpAt(E2E.adminTotpSecret, step);
}

export async function signIn(page: Page, email: string, password: string, next = "/") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(next)}`);
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await page.locator("form button[type=submit]").first().click();
}

export async function signInAsAdmin(page: Page, next = "/admin") {
  await signIn(page, E2E.adminEmail, E2E.password, next);
  await page.locator("input[autocomplete=one-time-code]:visible").fill(await nextTotp());
  await page.locator("form button[type=submit]").first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** Registers a new adult customer through the sign-up form. */
export async function registerCustomer(page: Page, email: string, name = "E2E Customer") {
  await page.goto("/register");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(E2E.password);
  await page.selectOption("select[name=birthMonth]", "6");
  await page.selectOption("select[name=birthYear]", "1985");
  await page.locator("input[name=acceptTerms]").check();
  await page.locator("form button[type=submit]").last().click();
  await expect(page.getByText("Your account is ready")).toBeVisible();
}
