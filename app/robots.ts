import type { MetadataRoute } from "next";
import { shop } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/account", "/order", "/search", "/wishlist"] }],
    sitemap: `${shop.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
