import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cardInclude, getProduct } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { shop } from "@/lib/config";
import { track } from "@/lib/events";
import { ProductView } from "@/components/shop/ProductView";
import { ProductCard } from "@/components/shop/ProductCard";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { Reviews } from "@/components/shop/Reviews";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const img = p.images[0]?.url;
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? p.description.slice(0, 155),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description: p.description.slice(0, 155), images: img ? [{ url: img }] : undefined, type: "website" },
  };
}

const ATTR_LABELS: [string, string][] = [
  ["fabric", "Fabric"], ["bottomFabric", "Bottom fabric"], ["dupatta", "Dupatta"], ["sleeve", "Sleeve"], ["neck", "Neck"],
  ["length", "Length"], ["pattern", "Pattern"], ["occasion", "Occasion"], ["lining", "Lining"], ["sheer", "Sheerness"], ["care", "Care"], ["set", "In the set"],
];

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p || p.status !== "ACTIVE") notFound();
  const [settings, offers, similar, fitAgg] = await Promise.all([
    getSettings(),
    db.coupon.findMany({ where: { active: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, select: { code: true, description: true }, take: 3, orderBy: { value: "desc" } }),
    db.product.findMany({ where: { status: "ACTIVE", categoryId: p.categoryId, id: { not: p.id } }, include: cardInclude, orderBy: { soldCount: "desc" }, take: 8 }),
    db.review.groupBy({ by: ["fit"], where: { productId: p.id, status: "APPROVED", fit: { not: null } }, _count: true }),
  ]);
  await track("view_item", { productId: p.id });

  const fitTotal = fitAgg.reduce((s, f) => s + f._count, 0);
  const trueFit = fitAgg.find((f) => f.fit === "TRUE")?._count ?? 0;
  const fitSummary = fitTotal >= 3 ? `${Math.round((trueFit / fitTotal) * 100)}% say "True to size"` : null;
  const attrs = ATTR_LABELS.map(([k, label]) => [label, p.attributes.filter((a) => a.key === k).map((a) => a.value).join(", ")] as const).filter(([, v]) => v);
  const chart = p.category.sizeChart;
  const inStock = p.variants.some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    image: p.images.slice(0, 4).map((i) => new URL(i.url, shop.siteUrl).toString()),
    description: p.description,
    brand: { "@type": "Brand", name: shop.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: p.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${shop.siteUrl}/p/${p.slug}`,
    },
    ...(p.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
  };

  return (
    <div className="mx-auto max-w-7xl pb-24 md:px-4 md:pt-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="px-4 py-2 text-[11px] text-muted md:px-0" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        {p.category.parent ? (<> / <Link href={`/c/${p.category.parent.slug}`}>{p.category.parent.name}</Link></>) : null}
        {" / "}<Link href={`/c/${p.category.slug}`}>{p.category.name}</Link>
      </nav>

      <ProductView
        id={p.id}
        slug={p.slug}
        name={p.name}
        price={p.price}
        mrp={p.mrp}
        sku={p.sku}
        modelInfo={p.modelInfo}
        videoUrl={p.videoUrl}
        isExchangeable={p.isExchangeable}
        ratingAvg={p.ratingAvg}
        ratingCount={p.ratingCount}
        fitSummary={fitSummary}
        images={p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, colour: i.colour }))}
        variants={p.variants.map((v) => ({ id: v.id, size: v.size, colour: v.colour, colourHex: v.colourHex, stock: v.stock }))}
        chart={chart ? { name: chart.name, unit: chart.unit, columns: chart.columns, rows: chart.rows as { size: string; values: string[] }[], howToMeasure: chart.howToMeasure, fitRule: chart.fitRule } : null}
        settings={settings}
        offers={offers}
        storeAddress={shop.address}
      />

      <div className="mt-6 px-4 md:ml-auto md:mt-10 md:w-[47%] md:px-0">
        <details open className="border-b border-line">
          <summary className="eyebrow cursor-pointer list-none py-3.5 text-[13px]">Product details</summary>
          <table className="mb-3 w-full border-collapse text-[12.5px]">
            <tbody>
              {attrs.map(([label, value]) => (
                <tr key={label}><td className="w-2/5 border border-line bg-surface px-2.5 py-2 text-muted">{label}</td><td className="border border-line px-2.5 py-2">{value}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">{p.description}</p>
        </details>
        <details className="border-b border-line">
          <summary className="eyebrow cursor-pointer list-none py-3.5 text-[13px]">Exchange & Returns</summary>
          <div className="mb-4 space-y-2 text-[13px] leading-relaxed text-muted">
            {p.isExchangeable ? (
              <>
                <p>Size exchange within {settings.exchangeWindowDays} days of delivery. Your first exchange is free, online or at our store.</p>
                <p>Refunds are given only if the item is defective or you received the wrong item.</p>
              </>
            ) : (
              <p>This is an innerwear / hygiene item and cannot be exchanged or returned, unless it is defective or wrong.</p>
            )}
            <Link href="/pages/exchange-policy" className="text-brand underline">Read the full exchange policy</Link>
          </div>
        </details>
        <details className="border-b border-line">
          <summary className="eyebrow cursor-pointer list-none py-3.5 text-[13px]">Shipping</summary>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">
            Ships in 1–2 days. Free shipping on orders above ₹{settings.freeShippingThreshold}. Local pincodes are delivered by our own store team. Check your delivery date above.
          </p>
        </details>
      </div>

      <Reviews productId={p.id} ratingAvg={p.ratingAvg} ratingCount={p.ratingCount} />

      {similar.length ? (
        <section className="mt-10 px-4 md:px-0">
          <h2 className="eyebrow mb-4 text-center text-[15px]">You may also like</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto md:grid md:grid-cols-4 md:gap-5">
            {similar.map((s) => (<ProductCard key={s.id} p={s} className="w-[44vw] shrink-0 md:w-auto" />))}
          </div>
        </section>
      ) : null}

      <RecentlyViewed exclude={p.slug} />
    </div>
  );
}
