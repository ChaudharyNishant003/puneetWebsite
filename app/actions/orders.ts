"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { exchangeEligibility, exchangeIsFree } from "@/lib/exchange";
import { uploadMedia } from "@/lib/integrations/images";
import { rateLimit } from "@/lib/rate-limit";

async function ownedItem(orderItemId: string) {
  const s = await getCustomerSession();
  if (!s) return null;
  const item = await db.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, exchanges: true, variant: { select: { productId: true, product: { select: { isInnerwear: true } } } } },
  });
  return item && item.order.customerId === s.sub ? { item, s } : null;
}

const exchangeSchema = z.object({
  orderItemId: z.string(),
  newSize: z.string().max(10).optional(),
  isDefect: z.boolean(),
  reason: z.string().trim().min(3, "Tell us briefly what's wrong").max(500),
});

export async function requestExchangeAction(raw: z.input<typeof exchangeSchema>) {
  const p = exchangeSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid request" };
  const owned = await ownedItem(p.data.orderItemId);
  if (!owned) return { ok: false, error: "Item not found" };
  const { item } = owned;
  const settings = await getSettings();
  const check = exchangeEligibility({
    deliveredAt: item.order.deliveredAt,
    isExchangeable: item.isExchangeable,
    isInnerwear: item.variant.product.isInnerwear,
    alreadyRequested: item.exchanges.some((e) => e.status !== "REJECTED" && e.status !== "COMPLETED"),
    windowDays: settings.exchangeWindowDays,
  });
  // Defects can be reported on non-exchangeable items too (policy: defective/wrong item is always covered).
  if (!check.eligible && !(p.data.isDefect && item.order.deliveredAt)) return { ok: false, error: check.reason };
  if (!p.data.isDefect && !p.data.newSize) return { ok: false, error: "Choose the size you want instead" };
  await db.exchangeRequest.create({
    data: {
      orderItemId: item.id,
      reason: p.data.reason,
      newSize: p.data.newSize,
      newColour: item.colour,
      isDefect: p.data.isDefect,
      isFree: exchangeIsFree({ previousExchanges: item.exchanges.filter((e) => e.status !== "REJECTED").length, isDefect: p.data.isDefect }),
    },
  });
  revalidatePath(`/order/${item.order.number}`);
  return { ok: true, error: null };
}

export async function submitReviewAction(form: FormData) {
  const owned = await ownedItem(String(form.get("orderItemId") ?? ""));
  if (!owned) return { ok: false, error: "Item not found" };
  const { item, s } = owned;
  if (item.order.status !== "DELIVERED") return { ok: false, error: "You can review after delivery" };
  if (!(await rateLimit(`review:${s.sub}`, 10, 3600))) return { ok: false, error: "Too many reviews, try later" };
  const p = z
    .object({
      rating: z.coerce.number().int().min(1).max(5),
      fit: z.enum(["SMALL", "TRUE", "LARGE"]).optional(),
      title: z.string().trim().max(80).optional(),
      body: z.string().trim().min(5, "Write a few words about the product").max(1500),
    })
    .safeParse({ rating: form.get("rating"), fit: form.get("fit") || undefined, title: form.get("title") || undefined, body: form.get("body") });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check your review" };
  const exists = await db.review.findUnique({ where: { orderItemId: item.id } });
  if (exists) return { ok: false, error: "You've already reviewed this item" };
  const photos: string[] = [];
  for (const f of form.getAll("photos").slice(0, 3)) {
    if (f instanceof File && f.size) {
      const up = await uploadMedia(f, "reviews");
      if ("error" in up) return { ok: false, error: up.error };
      photos.push(up.url);
    }
  }
  const customer = await db.customer.findUnique({ where: { id: s.sub } });
  await db.review.create({
    data: {
      productId: item.variant.productId,
      customerId: s.sub,
      orderItemId: item.id,
      authorName: customer?.name?.split(" ")[0] ?? "Customer",
      rating: p.data.rating,
      fit: p.data.fit,
      sizeBought: item.size,
      title: p.data.title,
      body: p.data.body,
      photos,
      verified: true,
      status: "PENDING",
    },
  });
  revalidatePath(`/order/${item.order.number}`);
  return { ok: true, error: null };
}
