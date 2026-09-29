import { expect, type Page } from "@playwright/test";

export const randomPhone = () => `9${Math.floor(100000000 + Math.random() * 899999999)}`;

// Mock SMS mode shows the OTP on screen ("Test mode … your OTP is 123456").
export async function loginWithOtp(page: Page, phone: string) {
  await page.getByPlaceholder("10-digit mobile number").fill(phone);
  await page.getByRole("button", { name: "Send OTP" }).click();
  const hint = page.getByText(/your OTP is/);
  await expect(hint).toBeVisible();
  const code = (await hint.locator("b").textContent())!.trim();
  await page.getByPlaceholder("6-digit OTP").fill(code);
  await page.getByRole("button", { name: "Verify & continue" }).click();
}

export async function addFirstInStockSize(page: Page, slug: string, buyNow = false) {
  await page.goto(`/p/${slug}`);
  await page.locator('[role="radio"]:not([disabled])').first().click();
  // Mobile sticky bar has the visible buttons
  await page.getByRole("button", { name: buyNow ? "Buy Now" : "Add to Bag" }).last().click();
  if (!buyNow) await expect(page.getByRole("dialog", { name: "Your bag" }).getByRole("link", { name: "Checkout" })).toBeVisible();
}

export async function fillNewAddress(page: Page, a: { pincode: string; name: string; phone: string }) {
  await page.getByLabel("Pincode").fill(a.pincode);
  await page.getByLabel("Full name").fill(a.name);
  await page.getByLabel("House / flat, street").fill("12, Test Colony Road");
  await page.getByLabel("City").fill("Jaipur");
  await page.getByLabel("State").selectOption("Rajasthan");
  await page.getByLabel("Delivery phone").fill(a.phone);
}

export async function adminLogin(page: Page, email = process.env.SEED_OWNER_EMAIL ?? "owner@puneet.test") {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}
