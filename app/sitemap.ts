import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { shop } from "@/lib/config";
import { OCCASION_BUDGET, virtualCollections } from "@/lib/catalog";
import { getFlags } from "@/lib/flags";
import { PAGE_SLUGS } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = shop.siteUrl.replace(/\/$/, "");
  const flags = await getFlags();
  const [products, cats] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...(flags.site("storePage") ? [{ url: `${base}/store`, changeFrequency: "monthly" as const, priority: 0.6 }] : []),
    ...cats.map((c) => ({ url: `${base}/c/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...Object.keys(virtualCollections).filter((s) => flags.site("occasionBudget") || !OCCASION_BUDGET(s)).map((s) => ({ url: `${base}/c/${s}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...PAGE_SLUGS.map((s) => ({ url: `${base}/pages/${s}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
