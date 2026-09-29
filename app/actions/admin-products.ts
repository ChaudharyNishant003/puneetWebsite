"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { uploadMedia } from "@/lib/integrations/images";
import { apparelGstRate } from "@/lib/pricing";
import { slugify } from "@/lib/format";
import { ATTR_KEYS } from "@/lib/constants";
import { refreshSearchText } from "@/lib/products";


const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().max(140).optional(),
  description: z.string().trim().min(10, "Add a short description").max(3000),
  categoryId: z.string().min(1, "Pick a category"),
  gender: z.enum(["WOMEN", "MEN", "KIDS", "UNISEX"]),
  price: z.coerce.number().int().min(1),
  mrp: z.coerce.number().int().min(1),
  hsn: z.string().trim().max(10).default("6211"),
  gstRate: z.coerce.number().int().min(0).max(28).optional(),
  badges: z.string().max(120).default(""),
  modelInfo: z.string().trim().max(120).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  isFeatured: z.boolean(),
  storeBestseller: z.boolean(),
  isExchangeable: z.boolean(),
  isInnerwear: z.boolean(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
});

export async function saveProductAction(_: unknown, form: FormData) {
  const u = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const raw = Object.fromEntries(form.entries());
  const parsed = productSchema.safeParse({
    ...raw,
    isFeatured: form.get("isFeatured") === "on",
    storeBestseller: form.get("storeBestseller") === "on",
    isExchangeable: form.get("isExchangeable") === "on",
    isInnerwear: form.get("isInnerwear") === "on",
    gstRate: raw.gstRate ? raw.gstRate : undefined,
    modelInfo: raw.modelInfo || undefined,
    seoTitle: raw.seoTitle || undefined,
    seoDescription: raw.seoDescription || undefined,
  });
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const d = parsed.data;
  if (d.mrp < d.price) return { error: "MRP cannot be lower than the selling price" };
  const badges = d.badges.split(",").map((b) => b.trim()).filter(Boolean).slice(0, 3);
  const slug = slugify(d.slug || d.name);
  const clash = await db.product.findFirst({ where: { slug, id: id ? { not: id } : undefined } });
  if (clash) return { error: `Another product already uses the link /p/${slug}. Change the name or link.` };
  const data = {
    name: d.name, slug, description: d.description, categoryId: d.categoryId, gender: d.gender, price: d.price, mrp: d.mrp, hsn: d.hsn,
    gstRate: d.gstRate ?? apparelGstRate(d.price), badges, modelInfo: d.modelInfo ?? null, status: d.status, isFeatured: d.isFeatured,
    storeBestseller: d.storeBestseller, isExchangeable: d.isInnerwear ? false : d.isExchangeable, isInnerwear: d.isInnerwear,
    seoTitle: d.seoTitle ?? null, seoDescription: d.seoDescription ?? null,
  };
  const attrs = ATTR_KEYS.flatMap((k) =>
    String(form.get(`attr_${k}`) ?? "").split(",").map((v) => v.trim()).filter(Boolean).slice(0, 5).map((value) => ({ key: k, value: value.slice(0, 80) })),
  );
  const product = id
    ? await db.product.update({ where: { id }, data })
    : await db.product.create({ data: { ...data, sku: `PG-${Date.now().toString(36).toUpperCase()}` } });
  await db.$transaction([db.productAttribute.deleteMany({ where: { productId: product.id } }), db.productAttribute.createMany({ data: attrs.map((a) => ({ ...a, productId: product.id })) })]);
  await refreshSearchText(product.id);
  await audit(u.email, id ? "product.update" : "product.create", "Product", product.id, { name: d.name, price: d.price, status: d.status });
  revalidatePath("/admin/products");
  revalidatePath(`/p/${slug}`);
  if (!id) redirect(`/admin/products/${product.id}?created=1`);
  return { error: null, ok: true };
}

const variantRow = z.object({ id: z.string().optional(), size: z.string().trim().min(1).max(12), colour: z.string().trim().min(1).max(30), colourHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), stock: z.number().int().min(0).max(9999) });

export async function saveVariantsAction(productId: string, rows: z.input<typeof variantRow>[]) {
  const u = await requireAdmin();
  const parsed = z.array(variantRow).max(200).safeParse(rows);
  if (!parsed.success) return { ok: false, error: "Check sizes, colours and stock numbers" };
  const p = await db.product.findUniqueOrThrow({ where: { id: productId } });
  const keep = new Set<string>();
  for (const [i, r] of parsed.data.entries()) {
    const sku = `${p.sku}-${slugify(r.colour).slice(0, 3).toUpperCase()}-${r.size.replace(/\W/g, "")}`;
    const v = await db.variant.upsert({
      where: { productId_size_colour: { productId, size: r.size, colour: r.colour } },
      create: { productId, size: r.size, colour: r.colour, colourHex: r.colourHex, stock: r.stock, sku, sortOrder: i },
      update: { colourHex: r.colourHex, stock: r.stock, sortOrder: i },
    });
    keep.add(v.id);
  }
  // Variants that were ordered can't be deleted; zero their stock instead.
  const removed = await db.variant.findMany({ where: { productId, id: { notIn: [...keep] } }, include: { _count: { select: { orderItems: true } } } });
  for (const v of removed) {
    if (v._count.orderItems) await db.variant.update({ where: { id: v.id }, data: { stock: 0 } });
    else await db.variant.delete({ where: { id: v.id } });
  }
  await refreshSearchText(productId);
  await audit(u.email, "product.variants", "Product", productId, { count: parsed.data.length });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/p/${p.slug}`);
  return { ok: true, error: null };
}

export async function uploadImagesAction(form: FormData) {
  await requireAdmin();
  const productId = String(form.get("productId"));
  const colour = String(form.get("colour") ?? "") || null;
  const p = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { _count: { select: { images: true } } } });
  let order = p._count.images;
  const errors: string[] = [];
  for (const f of form.getAll("files").slice(0, 12)) {
    if (!(f instanceof File) || !f.size) continue;
    const up = await uploadMedia(f, "products");
    if ("error" in up) {
      errors.push(`${f.name}: ${up.error}`);
      continue;
    }
    if (up.url.endsWith(".mp4") || up.url.includes("/video/")) await db.product.update({ where: { id: productId }, data: { videoUrl: up.url } });
    else await db.productImage.create({ data: { productId, colour, url: up.url, alt: `${p.name}${colour ? ` in ${colour}` : ""}`, sortOrder: order++ } });
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/p/${p.slug}`);
  return { ok: errors.length === 0, error: errors.join("; ") || null };
}

export async function deleteImageAction(imageId: string) {
  await requireAdmin();
  const img = await db.productImage.delete({ where: { id: imageId } });
  revalidatePath(`/admin/products/${img.productId}`);
  return { ok: true };
}

export async function moveImageAction(imageId: string, dir: -1 | 1) {
  await requireAdmin();
  const img = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });
  const all = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } });
  const i = all.findIndex((x) => x.id === imageId);
  const j = i + dir;
  if (j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, k) => db.productImage.update({ where: { id: x.id }, data: { sortOrder: k } })));
  revalidatePath(`/admin/products/${img.productId}`);
  return { ok: true };
}

export async function removeVideoAction(productId: string) {
  await requireAdmin();
  await db.product.update({ where: { id: productId }, data: { videoUrl: null } });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

// CSV: one row per variant. Product columns repeat; rows with the same "handle" form one product.
const CSV_HEADERS = ["handle", "name", "category_slug", "gender", "price", "mrp", "description", "badges", "model_info", "status", "innerwear", ...ATTR_KEYS.map((k) => `attr_${k}`), "colour", "colour_hex", "size", "stock", "image_urls"];

export async function csvTemplate() {
  await requireAdmin();
  return CSV_HEADERS.join(",") + "\n" + [
    "cotton-kurta-set-1", "Cotton Printed Kurta Set", "kurta-sets", "WOMEN", "1299", "1599", "Soft cotton set for daily wear", "New", "Model is 5'4\" wearing M", "ACTIVE", "no",
    ...ATTR_KEYS.map((k) => (k === "fabric" ? "Cotton" : k === "occasion" ? "Daily" : "")), "Maroon", "#7A1F2B", "M", "10", "",
  ].map((v) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v)).join(",") + "\n";
}

export async function importCsvAction(_: unknown, form: FormData) {
  const u = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose a CSV file", summary: null };
  if (file.size > 5 * 1024 * 1024) return { error: "CSV must be under 5 MB", summary: null };
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  if (parsed.errors.length) return { error: `Row ${parsed.errors[0].row}: ${parsed.errors[0].message}`, summary: null };
  const cats = new Map((await db.category.findMany()).map((c) => [c.slug, c]));
  const groups = new Map<string, Record<string, string>[]>();
  for (const r of parsed.data) {
    const h = (r.handle || slugify(r.name ?? "")).trim();
    if (!h) continue;
    (groups.get(h) ?? groups.set(h, []).get(h)!).push(r);
  }
  const problems: string[] = [];
  let created = 0, updated = 0, variants = 0;
  for (const [handle, rows] of groups) {
    const r0 = rows[0];
    const cat = cats.get((r0.category_slug ?? "").trim());
    const price = Number(r0.price), mrp = Number(r0.mrp || r0.price);
    if (!r0.name || !cat || !Number.isFinite(price) || price <= 0 || mrp < price) {
      problems.push(`${handle}: needs name, valid category_slug, price and MRP ≥ price`);
      continue;
    }
    const innerwear = /^(yes|true|1)$/i.test(r0.innerwear ?? "");
    const gender = ["WOMEN", "MEN", "KIDS", "UNISEX"].includes((r0.gender ?? "").toUpperCase()) ? (r0.gender.toUpperCase() as "WOMEN") : cat.gender;
    const data = {
      name: r0.name.trim().slice(0, 120), categoryId: cat.id, gender, price: Math.round(price), mrp: Math.round(mrp), gstRate: apparelGstRate(price),
      description: (r0.description || r0.name).slice(0, 3000), badges: (r0.badges ?? "").split("|").map((b) => b.trim()).filter(Boolean).slice(0, 3),
      modelInfo: r0.model_info || null, status: (["DRAFT", "ACTIVE", "ARCHIVED"].includes((r0.status ?? "").toUpperCase()) ? r0.status.toUpperCase() : "ACTIVE") as "ACTIVE",
      isInnerwear: innerwear, isExchangeable: !innerwear, hsn: innerwear ? "6108" : "6211",
    };
    const existing = await db.product.findUnique({ where: { slug: handle } });
    const p = existing ? await db.product.update({ where: { id: existing.id }, data }) : await db.product.create({ data: { ...data, slug: handle, sku: `PG-${handle.slice(0, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}` } });
    if (existing) updated++;
    else created++;
    const attrs = ATTR_KEYS.flatMap((k) => (r0[`attr_${k}`] ?? "").split("|").map((v) => v.trim()).filter(Boolean).map((value) => ({ productId: p.id, key: k, value })));
    await db.productAttribute.deleteMany({ where: { productId: p.id } });
    if (attrs.length) await db.productAttribute.createMany({ data: attrs });
    for (const [i, r] of rows.entries()) {
      const size = (r.size ?? "").trim(), colour = (r.colour ?? "").trim();
      if (!size || !colour) continue;
      const hex = /^#[0-9a-fA-F]{6}$/.test(r.colour_hex ?? "") ? r.colour_hex : "#999999";
      await db.variant.upsert({
        where: { productId_size_colour: { productId: p.id, size, colour } },
        create: { productId: p.id, size, colour, colourHex: hex, stock: Math.max(0, Number(r.stock) || 0), sku: `${p.sku}-${slugify(colour).slice(0, 3).toUpperCase()}-${size.replace(/\W/g, "")}`, sortOrder: i },
        update: { stock: Math.max(0, Number(r.stock) || 0), colourHex: hex },
      });
      variants++;
      for (const url of (r.image_urls ?? "").split("|").map((x) => x.trim()).filter((x) => /^https:\/\//.test(x))) {
        const has = await db.productImage.findFirst({ where: { productId: p.id, url } });
        if (!has) await db.productImage.create({ data: { productId: p.id, url, colour, alt: `${p.name} in ${colour}`, sortOrder: 99 } });
      }
    }
    await refreshSearchText(p.id);
  }
  await audit(u.email, "product.csv_import", "Product", undefined, { created, updated, variants, problems: problems.length });
  revalidatePath("/admin/products");
  return { error: null, summary: { created, updated, variants, problems } };
}

export async function archiveProductAction(productId: string) {
  const u = await requireAdmin();
  await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  await audit(u.email, "product.archive", "Product", productId);
  revalidatePath("/admin/products");
  return { ok: true };
}
