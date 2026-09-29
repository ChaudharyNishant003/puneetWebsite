import { expect, test } from "@playwright/test";
import { addFirstInStockSize, adminLogin, fillNewAddress, loginWithOtp, randomPhone } from "./helpers";

test.describe("storefront", () => {
  test("home, category and product pages render on mobile without horizontal scroll", async ({ page }) => {
    for (const path of ["/", "/c/women", "/p/cotton-printed-kurta-set-with-dupatta", "/store", "/pages/exchange-policy"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
    }
  });

  test("collection filters apply and show a live count", async ({ page }) => {
    await page.goto("/c/women");
    await page.getByRole("button", { name: /^Filter/ }).click();
    await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "M", exact: true }).click();
    const apply = page.getByRole("button", { name: /Apply \(\d+ items\)/ });
    await expect(apply).toBeVisible();
    await apply.click();
    await expect(page).toHaveURL(/size=M/);
  });

  test("Hinglish search finds office cotton kurtis under 1500", async ({ page }) => {
    await page.goto("/search?q=office+ke+liye+cotton+kurti+under+1500");
    await expect(page.getByText("Up to ₹1500")).toBeVisible();
    const prices = await page.locator("main h3 + p + p").allTextContents();
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) expect(Number(p.match(/₹([\d,]+)/)![1].replace(/,/g, ""))).toBeLessThanOrEqual(1500);
  });

  test("innerwear is clearly non-exchangeable", async ({ page }) => {
    await page.goto("/c/women-innerwear");
    await page.locator("main a[href^='/p/']").first().click();
    await expect(page.getByText("Non-exchangeable")).toBeVisible();
    await expect(page.getByText(/cannot be exchanged or returned for hygiene reasons/)).toBeVisible();
  });
});

test.describe("checkout", () => {
  test("COD order end to end with OTP login, then GST invoice", async ({ page }) => {
    const phone = randomPhone();
    await addFirstInStockSize(page, "cotton-printed-kurta-set-with-dupatta");
    await expect(page.getByRole("dialog", { name: "Your bag" })).toContainText("Cotton Printed Kurta Set");
    await page.getByRole("link", { name: "Checkout" }).click();
    await loginWithOtp(page, phone);
    await expect(page.getByText(`+91 ${phone}`)).toBeVisible();
    await fillNewAddress(page, { pincode: "302001", name: "E2E Buyer", phone });
    await expect(page.getByText(/Delivery by/)).toBeVisible();
    await page.getByText("Cash on Delivery", { exact: true }).click();
    await page.getByRole("button", { name: /Place order/ }).click();
    await expect(page.getByText("Thank you! Your order is placed.")).toBeVisible();
    const invoice = await page.request.get(page.url().replace(/\/order\/(\w+).*/, "/api/invoice/$1"));
    expect(invoice.headers()["content-type"]).toContain("application/pdf");
  });

  test("prepaid: failed payment keeps the bag, retry succeeds with prepaid discount", async ({ page }) => {
    const phone = randomPhone();
    await addFirstInStockSize(page, "men-formal-cotton-shirt", true);
    await page.waitForURL(/\/checkout/);
    await loginWithOtp(page, phone);
    await fillNewAddress(page, { pincode: "110001", name: "Prepaid Buyer", phone });
    await expect(page.getByText("Prepaid discount")).toBeVisible();
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.getByRole("button", { name: "Fail" }).click();
    await expect(page.getByText(/Payment was not completed/)).toBeVisible();
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.getByRole("button", { name: "Pay successfully" }).click();
    await expect(page.getByText("Thank you! Your order is placed.")).toBeVisible();
    await expect(page.getByText("Paid online")).toBeVisible();
  });

  test("COD is refused above the limit with a clear reason", async ({ page }) => {
    const phone = randomPhone();
    // Push the bag above the ₹3,000 COD limit with a few higher-priced items
    for (const slug of ["georgette-anarkali-kurta-set", "festive-silk-blend-kurta-set", "chanderi-embroidered-suit-set"]) {
      await addFirstInStockSize(page, slug);
    }
    await page.goto("/checkout");
    await loginWithOtp(page, phone);
    await fillNewAddress(page, { pincode: "302001", name: "Big Buyer", phone });
    await expect(page.getByText(/COD is available on orders up to/)).toBeVisible();
  });
});

test.describe("admin", () => {
  test("owner can move an order to delivered; customer then sees exchange", async ({ page }) => {
    const phone = randomPhone();
    await addFirstInStockSize(page, "everyday-rayon-kurti");
    await page.goto("/checkout");
    await loginWithOtp(page, phone);
    await fillNewAddress(page, { pincode: "302002", name: "Exchange Buyer", phone });
    await page.getByText("Cash on Delivery", { exact: true }).click();
    await page.getByRole("button", { name: /Place order/ }).click();
    await expect(page.getByText("Thank you! Your order is placed.")).toBeVisible();
    const orderUrl = page.url();
    const number = orderUrl.match(/order\/(\w+)/)![1];

    await adminLogin(page);
    await page.goto(`/admin/orders?q=${number}`);
    await page.getByRole("link", { name: number }).click();
    await page.getByRole("button", { name: "Mark Confirmed" }).click();
    await page.getByRole("button", { name: "Send out for local delivery" }).click();
    await page.getByRole("button", { name: "Mark Delivered" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`${number}.*Delivered`) })).toBeVisible();

    await page.goto(`/order/${number}`);
    await expect(page.getByRole("button", { name: "Exchange size" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Write a review" })).toBeVisible();
  });

  test("staff cannot open owner-only settings", async ({ page }) => {
    await adminLogin(page, process.env.SEED_STAFF_EMAIL ?? "staff@puneet.test");
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/denied=1/);
    await expect(page.getByText("That page is for the owner only.")).toBeVisible();
  });

  test("admin pages and APIs are closed to the public", async ({ page, request }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
    const csv = await request.get("/api/admin/products-csv");
    expect(csv.status()).toBe(401);
  });
});
