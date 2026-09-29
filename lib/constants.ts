export const ATTR_KEYS = ["occasion", "fabric", "bottomFabric", "dupatta", "sleeve", "length", "neck", "pattern", "lining", "sheer", "care", "set", "recipient"] as const;

export const ATTR_LABELS: Record<(typeof ATTR_KEYS)[number], string> = {
  occasion: "Occasion (Daily, Office, Festive, Wedding Guest)",
  fabric: "Fabric",
  bottomFabric: "Bottom fabric",
  dupatta: "Dupatta",
  sleeve: "Sleeve",
  length: "Length",
  neck: "Neck",
  pattern: "Pattern (Solid, Printed, Embroidered…)",
  lining: "Lining",
  sheer: "Sheerness",
  care: "Care",
  set: "In the set",
  recipient: "Gift for (Mother, Kids…)",
};

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
