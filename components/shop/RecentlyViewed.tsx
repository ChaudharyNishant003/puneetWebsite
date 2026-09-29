"use client";
import { useEffect, useState } from "react";
import type { CardProduct } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const [items, setItems] = useState<CardProduct[]>([]);
  useEffect(() => {
    let slugs: string[] = [];
    try {
      slugs = JSON.parse(localStorage.getItem("pg_recent") ?? "[]").filter((s: string) => s !== exclude).slice(0, 8);
    } catch {}
    if (!slugs.length) return;
    fetch(`/api/products?slugs=${slugs.join(",")}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => {});
  }, [exclude]);
  if (!items.length) return null;
  return (
    <section className="mt-10 px-4 md:px-0">
      <h2 className="eyebrow mb-4 text-center text-[15px]">Recently viewed</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {items.map((p) => (<ProductCard key={p.id} p={p} className="w-[40vw] shrink-0 md:w-56" />))}
      </div>
    </section>
  );
}
