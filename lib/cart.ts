import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { CART_COOKIE, getCustomerSession } from "./auth/session";
import { priceCart } from "./pricing";
import { getSettings } from "./settings";

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" as const } }, variants: { orderBy: { sortOrder: "asc" as const }, select: { id: true, size: true, colour: true, stock: true } } } },
        },
      },
    },
  },
};

async function cartToken(create: boolean) {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value;
  if (!token && create) {
    token = crypto.randomBytes(18).toString("base64url");
    jar.set(CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 86400 });
  }
  return token;
}

export async function getCart(create = false) {
  const session = await getCustomerSession();
  const token = await cartToken(create);
  if (!token) return null;
  let cart = await db.cart.findUnique({ where: { token }, include: cartInclude });
  if (!cart && create) cart = await db.cart.create({ data: { token, customerId: session?.sub }, include: cartInclude });
  if (cart && session && !cart.customerId) await db.cart.update({ where: { id: cart.id }, data: { customerId: session.sub } });
  return cart;
}

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCart>>>;

export async function addToCart(variantId: string, qty = 1) {
  const variant = await db.variant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || variant.product.status !== "ACTIVE") return { ok: false, error: "This item is no longer available" };
  const cart = (await getCart(true))!;
  const existing = cart.items.find((i) => i.variantId === variantId);
  const newQty = Math.min((existing?.qty ?? 0) + qty, 10);
  if (newQty > variant.stock) return { ok: false, error: variant.stock ? `Only ${variant.stock} left in this size` : "This size is sold out" };
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, qty: newQty },
    update: { qty: newQty },
  });
  return { ok: true };
}

export async function setCartQty(itemId: string, qty: number) {
  const cart = await getCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item not found" };
  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return { ok: true };
  }
  if (qty > item.variant.stock) return { ok: false, error: `Only ${item.variant.stock} left` };
  await db.cartItem.update({ where: { id: itemId }, data: { qty: Math.min(qty, 10) } });
  return { ok: true };
}

export async function changeCartVariant(itemId: string, variantId: string) {
  const cart = await getCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) return { ok: false, error: "Item not found" };
  const v = await db.variant.findUnique({ where: { id: variantId } });
  if (!v || v.productId !== item.variant.productId) return { ok: false, error: "Invalid size" };
  if (v.stock < item.qty) return { ok: false, error: "That size is sold out" };
  await db.$transaction([
    db.cartItem.delete({ where: { id: itemId } }),
    db.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, qty: item.qty },
      update: { qty: { increment: item.qty } },
    }),
  ]);
  return { ok: true };
}

export async function cartSummary(cart: CartWithItems | null, opts: { paymentMethod?: "PREPAID" | "COD"; delivery?: { mode: "LOCAL" | "COURIER"; localFee?: number } | null; isFirstOrder?: boolean } = {}) {
  const settings = await getSettings();
  const items = cart?.items ?? [];
  const coupon = cart?.couponCode ? await db.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
  const pricing = priceCart({
    lines: items.map((i) => ({ unitPrice: i.variant.product.price, mrp: i.variant.product.mrp, qty: i.qty, gstRate: i.variant.product.gstRate })),
    coupon,
    settings,
    ...opts,
  });
  const count = items.reduce((s, i) => s + i.qty, 0);
  return { pricing, count, coupon, settings };
}

export async function cartCount() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return 0;
  const r = await db.cartItem.aggregate({ where: { cart: { token } }, _sum: { qty: true } });
  return r._sum.qty ?? 0;
}
