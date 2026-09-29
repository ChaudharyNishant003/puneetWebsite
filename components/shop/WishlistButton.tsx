"use client";
import { useEffect, useState } from "react";
import { toggleWishlistAction } from "@/app/actions/account";
import { IconHeart } from "../icons";

// Guests keep a local wishlist; it merges into their account on login.
const KEY = "pg_wishlist";
export const readLocalWishlist = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};
const writeLocal = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
};

export function WishlistButton({ productId, large = false }: { productId: string; large?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const local = readLocalWishlist().includes(productId);
    setOn(local);
    const onSync = () => setOn(readLocalWishlist().includes(productId));
    window.addEventListener("pg:wishlist", onSync);
    return () => window.removeEventListener("pg:wishlist", onSync);
  }, [productId]);

  const toggle = async () => {
    const ids = readLocalWishlist();
    const next = on ? ids.filter((i) => i !== productId) : [productId, ...ids].slice(0, 100);
    writeLocal(next);
    setOn(!on);
    window.dispatchEvent(new Event("pg:wishlist"));
    await toggleWishlistAction(productId, !on).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center justify-center rounded-full bg-white/95 shadow-sm ${large ? "h-10 w-10" : "h-7 w-7"} ${on ? "text-brand" : "text-dark"}`}
    >
      <IconHeart size={large ? 20 : 15} filled={on} />
    </button>
  );
}
