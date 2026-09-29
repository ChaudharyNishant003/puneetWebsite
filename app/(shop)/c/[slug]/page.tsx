import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { facets, listProducts, resolveCollection } from "@/lib/catalog";
import { parseListParams, type SP } from "@/lib/params";
import { shop } from "@/lib/config";
import { ProductCard } from "@/components/shop/ProductCard";
import { FilterBar } from "@/components/shop/FilterBar";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await resolveCollection(slug);
  if (!c) return {};
  return {
    title: `${c.title} Online`,
    description: `Shop ${c.title.toLowerCase()} at ${shop.name}. Genuine prices, COD, free first size exchange and delivery across India.`,
    alternates: { canonical: `/c/${slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = await resolveCollection(slug);
  if (!c) notFound();
  const lp = parseListParams(sp);
  const [{ items, total }, f] = await Promise.all([listProducts(c.where, lp, slug), facets(c.where)]);
  const nextPage = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v == null ? [] : Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]])));
  nextPage.set("page", String(lp.page + 1));

  return (
    <div className="mx-auto max-w-7xl px-4">
      <nav className="py-3 text-[11px] text-muted" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <span className="text-text">{c.title}</span>
      </nav>
      <div className="text-center">
        <h1 className="eyebrow text-lg md:text-2xl">{c.title}</h1>
        {c.subtitle ? <p className="mt-1 text-xs text-muted md:text-sm">{c.subtitle}</p> : null}
        <p className="mt-1 text-xs text-muted">{total} products</p>
      </div>
      {c.category?.children.length ? (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto md:justify-center">
          {c.category.children.map((ch) => (<Link key={ch.id} href={`/c/${ch.slug}`} className="shrink-0 border border-line-strong px-3 py-1.5 text-xs">{ch.name}</Link>))}
        </div>
      ) : null}
      <FilterBar slug={slug} facets={f} total={total} />
      {items.length ? (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
            {items.map((p, i) => (<ProductCard key={p.id} p={p} priority={i < 4} />))}
          </div>
          {items.length < total ? (
            <div className="mt-8 text-center">
              <p className="mb-3 text-xs text-muted">Showing {items.length} of {total}</p>
              <Link href={`/c/${slug}?${nextPage}`} scroll={false} className="btn btn-outline">Load more</Link>
            </div>
          ) : null}
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="font-medium">No products match these filters</p>
          <Link href={`/c/${slug}`} className="btn btn-outline mt-4">Clear filters</Link>
        </div>
      )}
    </div>
  );
}
