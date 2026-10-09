import { describe, expect, it } from "vitest";
import { priceCart, codEligibility, couponAmount, includedTax, apparelGstRate, type CouponLike } from "@/lib/pricing";
import { defaultSettings } from "@/lib/config";

const s = { ...defaultSettings, courierShippingFee: 79 };
const coupon = (o: Partial<CouponLike>): CouponLike => ({
  code: "X", type: "FLAT", value: 100, minCart: 0, maxDiscount: null, prepaidOnly: false, firstOrderOnly: false,
  active: true, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, ...o,
});

describe("priceCart", () => {
  const lines = [{ unitPrice: 1299, mrp: 1599, qty: 1, gstRate: 5 }];

  it("charges courier shipping below the free-shipping threshold", () => {
    const r = priceCart({ lines: [{ unitPrice: 549, mrp: 649, qty: 1, gstRate: 5 }], delivery: { mode: "COURIER" }, settings: s });
    expect(r.shippingFee).toBe(79);
    expect(r.amountToFreeShipping).toBe(450);
    expect(r.total).toBe(628);
  });

  it("ships free on every order when the courier fee is 0", () => {
    const r = priceCart({ lines: [{ unitPrice: 549, mrp: 649, qty: 1, gstRate: 5 }], delivery: { mode: "COURIER" }, settings: { ...s, courierShippingFee: 0 } });
    expect(r.shippingFee).toBe(0);
    expect(r.amountToFreeShipping).toBe(0);
    expect(r.total).toBe(549);
  });

  it("gives free courier shipping at or above the threshold", () => {
    const r = priceCart({ lines, delivery: { mode: "COURIER" }, settings: s });
    expect(r.shippingFee).toBe(0);
  });

  it("uses the local pincode fee for local delivery", () => {
    const r = priceCart({ lines, delivery: { mode: "LOCAL", localFee: 49 }, settings: s });
    expect(r.shippingFee).toBe(49);
  });

  it("applies prepaid discount capped at the max", () => {
    const r = priceCart({ lines: [{ unitPrice: 4000, mrp: 5000, qty: 1, gstRate: 18 }], paymentMethod: "PREPAID", settings: s });
    expect(r.prepaidDiscount).toBe(150);
    const small = priceCart({ lines, paymentMethod: "PREPAID", settings: s });
    expect(small.prepaidDiscount).toBe(64); // 5% of 1299
  });

  it("applies prepaid discount after the coupon", () => {
    const r = priceCart({ lines, coupon: coupon({ value: 100 }), paymentMethod: "PREPAID", settings: s });
    expect(r.couponDiscount).toBe(100);
    expect(r.prepaidDiscount).toBe(59); // 5% of 1199
    expect(r.total).toBe(1299 - 100 - 59);
  });

  it("rejects a coupon below its minimum cart", () => {
    const r = priceCart({ lines: [{ unitPrice: 500, mrp: 600, qty: 1, gstRate: 5 }], coupon: coupon({ minCart: 999 }), settings: s });
    expect(r.couponDiscount).toBe(0);
    expect(r.couponError).toMatch(/Add ₹499 more/);
  });

  it("rejects prepaid-only coupons on COD and first-order coupons for repeat buyers", () => {
    expect(priceCart({ lines, coupon: coupon({ prepaidOnly: true }), paymentMethod: "COD", settings: s }).couponError).toMatch(/prepaid/);
    expect(priceCart({ lines, coupon: coupon({ firstOrderOnly: true }), isFirstOrder: false, settings: s }).couponError).toMatch(/first order/);
  });

  it("rejects expired and exhausted coupons", () => {
    const now = new Date("2026-10-01");
    expect(priceCart({ lines, coupon: coupon({ endsAt: new Date("2026-09-01") }), settings: s, now }).couponError).toMatch(/expired/);
    expect(priceCart({ lines, coupon: coupon({ usageLimit: 5, usedCount: 5 }), settings: s }).couponError).toMatch(/limit/);
  });

  it("computes included GST on the discounted amount", () => {
    const r = priceCart({ lines: [{ unitPrice: 1050, mrp: 1200, qty: 1, gstRate: 5 }], settings: s });
    expect(r.taxTotal).toBe(50);
  });

  it("adds a COD fee only for COD", () => {
    const withFee = { ...s, codFee: 49 };
    expect(priceCart({ lines, paymentMethod: "COD", settings: withFee }).codFee).toBe(49);
    expect(priceCart({ lines, paymentMethod: "PREPAID", settings: withFee }).codFee).toBe(0);
  });
});

describe("couponAmount", () => {
  it("caps percent coupons at maxDiscount and never exceeds subtotal", () => {
    expect(couponAmount(coupon({ type: "PERCENT", value: 10, maxDiscount: 150 }), 3000)).toBe(150);
    expect(couponAmount(coupon({ value: 500 }), 300)).toBe(300);
  });
});

describe("codEligibility", () => {
  it("blocks over the limit, blocked pincodes and blocked customers", () => {
    expect(codEligibility({ total: 3500, settings: s, pincodeCodAllowed: true, customerCodBlocked: false }).allowed).toBe(false);
    expect(codEligibility({ total: 1000, settings: s, pincodeCodAllowed: false, customerCodBlocked: false }).allowed).toBe(false);
    expect(codEligibility({ total: 1000, settings: s, pincodeCodAllowed: true, customerCodBlocked: true }).allowed).toBe(false);
    expect(codEligibility({ total: 3000, settings: s, pincodeCodAllowed: true, customerCodBlocked: false }).allowed).toBe(true);
  });
});

describe("tax helpers", () => {
  it("extracts included tax and picks apparel GST slab", () => {
    expect(includedTax(1180, 18)).toBe(180);
    expect(apparelGstRate(2500)).toBe(5);
    expect(apparelGstRate(2501)).toBe(18);
  });
});
