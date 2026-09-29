// Shop identity. Placeholders until the client confirms name, city, GST and domain.
// Everything user-facing reads from here, so replacing these values rebrands the site.
export const shop = {
  name: process.env.NEXT_PUBLIC_SHOP_NAME ?? "Puneet Garments",
  shortName: process.env.NEXT_PUBLIC_SHOP_SHORT ?? "Puneet",
  tagline: "Poore parivaar ke kapde, ek hi dukaan mein",
  since: 1998,
  city: process.env.NEXT_PUBLIC_SHOP_CITY ?? "[City]",
  state: process.env.NEXT_PUBLIC_SHOP_STATE ?? "Rajasthan",
  address: process.env.NEXT_PUBLIC_SHOP_ADDRESS ?? "Main Bazaar, [City]",
  pincode: process.env.NEXT_PUBLIC_SHOP_PINCODE ?? "302001",
  hours: "Daily 10 AM – 9 PM",
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE ?? "+91 90000 00000",
  email: process.env.NEXT_PUBLIC_SHOP_EMAIL ?? "hello@puneetgarments.in",
  gstin: process.env.SHOP_GSTIN ?? "GSTIN-PENDING",
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
  courierShippingFee: 79,
  exchangeWindowDays: 7,
  codRtoBlockThreshold: 2,
  lowStockDefault: 3,
};

export type Settings = typeof defaultSettings;
