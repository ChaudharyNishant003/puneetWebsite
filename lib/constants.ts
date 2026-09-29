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
