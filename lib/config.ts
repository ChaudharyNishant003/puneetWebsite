// Shop identity, from the client's answers (9 Oct 2026). City, address, GSTIN and domain are still pending.
// Everything user-facing reads from here, so replacing these values rebrands the site.
// Demo deployments (no SMS/payment keys) show OTPs on screen and allow simulated payments.
// Never set DEMO_MODE on the real store.
export const isDemoMode = () => process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";

export const shop = {
  name: process.env.NEXT_PUBLIC_SHOP_NAME ?? "Katten Hilifiger",
  shortName: process.env.NEXT_PUBLIC_SHOP_SHORT ?? "KH",
  tagline: "Poore parivaar ke kapde, ek hi dukaan mein",
  since: 2026,
  city: process.env.NEXT_PUBLIC_SHOP_CITY ?? "[City]",
  state: process.env.NEXT_PUBLIC_SHOP_STATE ?? "Rajasthan",
  address: process.env.NEXT_PUBLIC_SHOP_ADDRESS ?? "", // business address pending (online-only store)
  pincode: process.env.NEXT_PUBLIC_SHOP_PINCODE ?? "302001",
  hours: "Daily 10 AM – 9 PM", // customer support hours (online-only store)
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE ?? "+91 63956 63265",
  email: process.env.NEXT_PUBLIC_SHOP_EMAIL ?? "puneettyagi2008@gmail.com",
  // Empty until the business registers for GST: no GST is shown or charged and the invoice is a plain receipt.
  gstin: process.env.SHOP_GSTIN ?? "",
  // Online-only store: no walk-in shop, so the store page, directions and "visit us" lines stay hidden.
  hasStore: process.env.NEXT_PUBLIC_SHOP_HAS_STORE === "1",
  mapsUrl: process.env.NEXT_PUBLIC_SHOP_MAPS_URL ?? "https://maps.google.com/?q=Main+Bazaar",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

// Defaults for admin-editable settings (Setting table overrides these).
export const defaultSettings = {
  codMaxAmount: 3000,
  codFee: 0,
  prepaidDiscountPercent: 5,
  prepaidDiscountMax: 150,
  freeShippingThreshold: 999,
  courierShippingFee: 0, // 0 = delivery is free on every order
  exchangeWindowDays: 7,
  codRtoBlockThreshold: 2,
  lowStockDefault: 3,
};

export type Settings = typeof defaultSettings;
