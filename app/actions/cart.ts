"use server";
import { revalidatePath } from "next/cache";
import { addToCart, setCartQty, changeCartVariant, getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { track } from "@/lib/events";

export async function addToCartAction(variantId: string, qty = 1) {
  const r = await addToCart(variantId, qty);
  if (r.ok) await track("add_to_cart", { variantId, qty });
  revalidatePath("/", "layout");
  return r;
}

export async function setQtyAction(itemId: string, qty: number) {
  const r = await setCartQty(itemId, qty);
  revalidatePath("/", "layout");
  return r;
}

export async function changeVariantAction(itemId: string, variantId: string) {
  const r = await changeCartVariant(itemId, variantId);
  revalidatePath("/", "layout");
  return r;
}

export async function applyCouponAction(code: string) {
  const cart = await getCart();
  if (!cart) return { ok: false, error: "Your bag is empty" };
  const c = code.trim().toUpperCase();
  if (!c) {
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    revalidatePath("/", "layout");
    return { ok: true };
  }
  const coupon = await db.coupon.findUnique({ where: { code: c } });
  if (!coupon || !coupon.active) return { ok: false, error: "This coupon code is not valid" };
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: c } });
  revalidatePath("/", "layout");
  return { ok: true };
}
