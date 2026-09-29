import type { MetadataRoute } from "next";
import { shop } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Demo/staging deployments must never be indexed.
  if (process.env.DEMO_MODE === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/account", "/order", "/search", "/wishlist"] }],
    sitemap: `${shop.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
