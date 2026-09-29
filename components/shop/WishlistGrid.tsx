"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CardProduct } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";
import { readLocalWishlist } from "./WishlistButton";
import { IconHeart } from "../icons";

export function WishlistGrid({ serverItems, loggedIn }: { serverItems: CardProduct[] | null; loggedIn: boolean }) {
  const [items, setItems] = useState<CardProduct[] | null>(serverItems);

  useEffect(() => {
    if (serverItems) {
      // Keep the local copy in sync with the account so hearts show correctly everywhere.
      try {
        localStorage.setItem("pg_wishlist", JSON.stringify(serverItems.map((p) => p.id)));
      } catch {}
      return;
    }
    const load = () => {
      const ids = readLocalWishlist();
      if (!ids.length) return setItems([]);
      fetch(`/api/products?ids=${ids.join(",")}`).then((r) => r.json()).then((j) => setItems(j.items ?? []));
    };
    load();
    window.addEventListener("pg:wishlist", load);
    return () => window.removeEventListener("pg:wishlist", load);
  }, [serverItems]);

  if (items == null) return <p className="text-center text-sm text-muted">Loading…</p>;
  if (!items.length)
    return (
      <div className="py-12 text-center">
        <IconHeart size={40} className="mx-auto text-muted" />
        <p className="mt-3 font-medium">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-muted">Tap the heart on any product to save it here.</p>
        <Link href="/c/new-arrivals" className="btn btn-dark mt-5">Browse New Arrivals</Link>
      </div>
    );
  return (
    <>
      {!loggedIn ? <p className="mb-4 text-center text-xs text-muted"><Link href="/account/login?next=/wishlist" className="text-brand underline">Log in</Link> to keep your wishlist on every device.</p> : null}
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (<ProductCard key={p.id} p={p} />))}
      </div>
    </>
  );
}
