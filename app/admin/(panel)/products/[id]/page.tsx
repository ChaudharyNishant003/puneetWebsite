import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getFlags, requirePage } from "@/lib/flags";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantEditor } from "@/components/admin/VariantEditor";
import { ImageManager } from "@/components/admin/ImageManager";

export const metadata = { title: "Product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdmin();
  await requirePage("products");
  const { id } = await params;
  const { created } = await searchParams;
  const isNew = id === "new";
  const [p, cats] = await Promise.all([
    isNew ? null : db.product.findUnique({ where: { id }, include: { attributes: true, variants: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } }, category: { include: { sizeChart: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { parent: { select: { name: true } } } }),
  ]);
  if (!isNew && !p) notFound();
  const flags = await getFlags();
  const attrs: Record<string, string> = {};
  for (const a of p?.attributes ?? []) attrs[a.key] = attrs[a.key] ? `${attrs[a.key]}, ${a.value}` : a.value;

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <Link href="/admin/products" className="text-xs text-muted underline">← Products</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{isNew ? "Add product" : p!.name}</h1>
          {p ? <Link href={`/p/${p.slug}`} target="_blank" className="text-xs text-brand underline">View on site ↗</Link> : null}
        </div>
        {created ? <p className="mt-2 bg-green-50 p-2 text-sm text-save">Product created. Now add sizes/stock and photos below.</p> : null}
      </div>
      <ProductForm
        product={p ? { id: p.id, name: p.name, slug: p.slug, description: p.description, categoryId: p.categoryId, gender: p.gender, price: p.price, mrp: p.mrp, hsn: p.hsn, gstRate: p.gstRate, badges: p.badges.join(", "), modelInfo: p.modelInfo ?? "", status: p.status, isFeatured: p.isFeatured, storeBestseller: p.storeBestseller, isExchangeable: p.isExchangeable, isInnerwear: p.isInnerwear, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" } : null}
        attrs={attrs}
        show={{ details: flags.admin("productDetails"), badges: flags.admin("badges"), seo: flags.admin("seo") }}
        categories={cats.map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} › ${c.name}` : c.name, gender: c.gender }))}
      />
      {p ? (
        <>
          {flags.admin("stockGrid") ? <VariantEditor productId={p.id} initial={p.variants.map((v) => ({ id: v.id, size: v.size, colour: v.colour, colourHex: v.colourHex, stock: v.stock }))} sizeHint={p.category.sizeChart ? (p.category.sizeChart.rows as { size: string }[]).map((r) => r.size) : []} /> : null}
          {flags.admin("photos") || flags.admin("video") ? <ImageManager allowPhotos={flags.admin("photos")} allowVideo={flags.admin("video")} productId={p.id} images={p.images.map((i) => ({ id: i.id, url: i.url, colour: i.colour }))} colours={[...new Set(p.variants.map((v) => v.colour))]} videoUrl={p.videoUrl} /> : null}
        </>
      ) : null}
    </div>
  );
}
