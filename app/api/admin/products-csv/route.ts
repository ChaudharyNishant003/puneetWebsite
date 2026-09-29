import { NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/session";
import { ATTR_KEYS } from "@/lib/constants";
import { isOn } from "@/lib/flags";

// Export the whole catalogue in the same format the importer reads (one row per variant).
export async function GET() {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!(await isOn("csvExport", "admin"))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const products = await db.product.findMany({ include: { category: true, attributes: true, variants: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "asc" } });
  const rows = products.flatMap((p) =>
    (p.variants.length ? p.variants : [null]).map((v) => ({
      handle: p.slug,
      name: p.name,
      category_slug: p.category.slug,
      gender: p.gender,
      price: p.price,
      mrp: p.mrp,
      description: p.description,
      badges: p.badges.join("|"),
      model_info: p.modelInfo ?? "",
      status: p.status,
      innerwear: p.isInnerwear ? "yes" : "no",
      ...Object.fromEntries(ATTR_KEYS.map((k) => [`attr_${k}`, p.attributes.filter((a) => a.key === k).map((a) => a.value).join("|")])),
      colour: v?.colour ?? "",
      colour_hex: v?.colourHex ?? "",
      size: v?.size ?? "",
      stock: v?.stock ?? "",
      image_urls: v ? p.images.filter((i) => i.colour === v.colour && i.url.startsWith("https://")).map((i) => i.url).join("|") : "",
    })),
  );
  const csv = Papa.unparse(rows);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
