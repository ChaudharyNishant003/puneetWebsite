import type { Metadata } from "next";
import Link from "next/link";
import { getMenu, virtualCollections } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop by Category" };
export const dynamic = "force-dynamic";

export default async function Categories() {
  const menu = await getMenu();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="eyebrow mb-5 text-center text-lg">Shop</h1>
      {menu.map((m) => (
        <section key={m.id} className="mb-6">
          <Link href={`/c/${m.slug}`} className="eyebrow mb-2 flex justify-between border-b border-line pb-2 text-sm">{m.name} <span className="text-xs font-normal normal-case text-brand">View all</span></Link>
          <div className="grid grid-cols-2 gap-2">
            {m.children.map((c) => (<Link key={c.id} href={`/c/${c.slug}`} className="bg-surface px-3 py-3 text-sm">{c.name}</Link>))}
          </div>
        </section>
      ))}
      <section className="mb-6">
        <p className="eyebrow mb-2 border-b border-line pb-2 text-sm">Occasion & Budget</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(virtualCollections).map(([slug, c]) => (<Link key={slug} href={`/c/${slug}`} className="bg-surface px-3 py-3 text-sm">{c.title}</Link>))}
        </div>
      </section>
    </div>
  );
}
