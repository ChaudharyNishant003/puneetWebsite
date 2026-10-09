import { cache } from "react";
import { db } from "./db";
import { defaultSettings, type Settings } from "./config";
import { getFlags } from "./flags";

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const out: Settings = { ...defaultSettings };
  for (const r of rows) {
    if (r.key in out && typeof r.value === "number") (out as Record<string, number>)[r.key] = r.value;
  }
  return out;
});

// Settings as the storefront should apply them: switched-off features contribute nothing.
export async function getShopSettings(): Promise<Settings> {
  const [s, f] = await Promise.all([getSettings(), getFlags()]);
  return { ...s, prepaidDiscountPercent: f.site("prepaidDiscount") ? s.prepaidDiscountPercent : 0, codFee: f.site("cod") ? s.codFee : 0 };
}

export async function saveSettings(values: Partial<Settings>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value: value as number }, update: { value: value as number } }),
    ),
  );
}

export async function getCms<T>(key: string, fallback: T): Promise<T> {
  const b = await db.cmsBlock.findUnique({ where: { key } });
  return b && b.active ? (b.content as T) : fallback;
}
