import type { Settings } from "./config";

export type CouponLike = {
  code: string;
  type: "FLAT" | "PERCENT";
  value: number;
  minCart: number;
  maxDiscount: number | null;
  prepaidOnly: boolean;
  firstOrderOnly: boolean;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
};

export type PricingLine = { unitPrice: number; mrp: number; qty: number; gstRate: number };

export type PricingInput = {
  lines: PricingLine[];
  coupon?: CouponLike | null;
  paymentMethod?: "PREPAID" | "COD";
  delivery?: { mode: "LOCAL" | "COURIER"; localFee?: number } | null;
  isFirstOrder?: boolean;
  settings: Settings;
  now?: Date;
};

export type PricingResult = {
  subtotal: number;
  mrpTotal: number;
  couponDiscount: number;
  couponError: string | null;
  prepaidDiscount: number;
  shippingFee: number;
  codFee: number;
  total: number;
  taxTotal: number;
  amountToFreeShipping: number;
};

export function validateCoupon(
  c: CouponLike,
  subtotal: number,
  opts: { paymentMethod?: "PREPAID" | "COD"; isFirstOrder?: boolean; now?: Date },
): string | null {
  const now = opts.now ?? new Date();
  if (!c.active) return "This coupon is no longer active";
  if (c.startsAt && now < c.startsAt) return "This coupon is not active yet";
  if (c.endsAt && now > c.endsAt) return "This coupon has expired";
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "This coupon has reached its usage limit";
  if (subtotal < c.minCart) return `Add ₹${c.minCart - subtotal} more to use ${c.code}`;
  if (c.firstOrderOnly && opts.isFirstOrder === false) return `${c.code} is only for your first order`;
  if (c.prepaidOnly && opts.paymentMethod === "COD") return `${c.code} is valid only on prepaid payments`;
  return null;
}

export function couponAmount(c: CouponLike, subtotal: number): number {
  let d = c.type === "FLAT" ? c.value : Math.floor((subtotal * c.value) / 100);
  if (c.maxDiscount != null) d = Math.min(d, c.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

// GST is included in selling prices (Indian MRP convention); this extracts the tax portion.
export function includedTax(amount: number, rate: number): number {
  return Math.round((amount * rate) / (100 + rate));
}

export function priceCart(input: PricingInput): PricingResult {
  const { lines, settings } = input;
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);

  let couponDiscount = 0;
  let couponError: string | null = null;
  if (input.coupon) {
    couponError = validateCoupon(input.coupon, subtotal, input);
    if (!couponError) couponDiscount = couponAmount(input.coupon, subtotal);
  }

  const afterCoupon = subtotal - couponDiscount;

  let prepaidDiscount = 0;
  if (input.paymentMethod === "PREPAID" && settings.prepaidDiscountPercent > 0) {
    prepaidDiscount = Math.min(
      Math.floor((afterCoupon * settings.prepaidDiscountPercent) / 100),
      settings.prepaidDiscountMax,
    );
  }

  let shippingFee = 0;
  if (input.delivery) {
    if (input.delivery.mode === "LOCAL") shippingFee = input.delivery.localFee ?? 0;
    else shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.courierShippingFee;
  }

  const codFee = input.paymentMethod === "COD" ? settings.codFee : 0;
  const total = Math.max(0, afterCoupon - prepaidDiscount + shippingFee + codFee);

  // Apportion discounts across lines to compute GST on what is actually charged.
  const discountTotal = couponDiscount + prepaidDiscount;
  const taxTotal = lines.reduce((s, l) => {
    const gross = l.unitPrice * l.qty;
    const share = subtotal > 0 ? (gross / subtotal) * discountTotal : 0;
    return s + includedTax(gross - share, l.gstRate);
  }, 0);

  return {
    subtotal,
    mrpTotal,
    couponDiscount,
    couponError,
    prepaidDiscount,
    shippingFee,
    codFee,
    total,
    taxTotal,
    amountToFreeShipping: settings.courierShippingFee > 0 ? Math.max(0, settings.freeShippingThreshold - subtotal) : 0,
  };
}

export type CodCheck = { allowed: boolean; reason?: string };

export function codEligibility(p: {
  total: number;
  settings: Settings;
  pincodeCodAllowed: boolean;
  customerCodBlocked: boolean;
  hasInnerwearOnly?: boolean;
}): CodCheck {
  if (p.customerCodBlocked) return { allowed: false, reason: "COD is not available on this number. Please pay online." };
  if (!p.pincodeCodAllowed) return { allowed: false, reason: "COD is not available for this pincode." };
  if (p.total > p.settings.codMaxAmount)
    return { allowed: false, reason: `COD is available on orders up to ₹${p.settings.codMaxAmount}.` };
  return { allowed: true };
}

// GST rate on apparel in India depends on the selling price per piece.
export function apparelGstRate(unitPrice: number): number {
  return unitPrice <= 2500 ? 5 : 18;
}
