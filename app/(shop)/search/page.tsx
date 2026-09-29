import type { Metadata } from "next";
import Link from "next/link";
import { searchProducts } from "@/lib/search/search";
import { track } from "@/lib/events";
import { ProductCard } from "@/components/shop/ProductCard";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim();
  if (!q) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="eyebrow text-lg">Search</h1>
        <p className="mt-2 text-sm text-muted">Use the search icon at the top to find kurtas, sarees, shirts and more.</p>
      </div>
    );
  }
  const { items, parsed, relaxed, didYouMean } = await searchProducts(q);
  await track("search", { q, results: items.length });
  const understood = [
    ...Object.entries(parsed.attributes).flatMap(([k, v]) => v.map((x) => `${k === "colour" ? "Colour" : k[0].toUpperCase() + k.slice(1)}: ${x}`)),
    ...(parsed.minPrice ? [`From ₹${parsed.minPrice}`] : []),
    ...(parsed.maxPrice ? [`Up to ₹${parsed.maxPrice}`] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="py-5 text-center">
        <h1 className="eyebrow text-lg">Results for “{q}”</h1>
        <p className="mt-1 text-xs text-muted">{items.length} products</p>
        {didYouMean ? <p className="mt-1 text-xs">Showing results for <b>{didYouMean}</b></p> : null}
        {understood.length ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">{understood.map((u) => (<span key={u} className="bg-surface px-2.5 py-1 text-xs">{u}</span>))}</div>
        ) : null}
        {relaxed ? <p className="mt-2 text-xs text-muted">No exact match, so we are showing close matches.</p> : null}
      </div>
      {items.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (<ProductCard key={p.id} p={p} priority={i < 4} />))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="font-medium">Nothing found for “{q}”</p>
          <p className="mt-1 text-sm text-muted">Try a simpler word like “kurti”, “saree” or “shirt”, or ask us at the store.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[["new-arrivals", "New Arrivals"], ["women", "Women"], ["men", "Men"], ["kids", "Kids"]].map(([s, n]) => (<Link key={s} href={`/c/${s}`} className="border border-line-strong px-3 py-1.5 text-sm">{n}</Link>))}
          </div>
        </div>
      )}
    </div>
  );
}
