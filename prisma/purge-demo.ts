/* Removes every dummy row (isDemo=true) and the generated placeholder images. Run before launch. */
import { PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();

async function main() {
  if (!process.argv.includes("--yes")) {
    console.log("This deletes ALL demo products, orders, reviews and customers. Re-run with --yes to confirm.");
    return;
  }
  const r1 = await db.order.deleteMany({ where: { isDemo: true } });
  const r2 = await db.review.deleteMany({ where: { isDemo: true } });
  // Variants of demo products may be referenced by real orders; keep those products archived instead.
  const referenced = await db.orderItem.findMany({ where: { variant: { product: { isDemo: true } } }, select: { variant: { select: { productId: true } } } });
  const keep = new Set(referenced.map((r) => r.variant.productId));
  await db.product.updateMany({ where: { id: { in: [...keep] } }, data: { status: "ARCHIVED" } });
  const r3 = await db.product.deleteMany({ where: { isDemo: true, id: { notIn: [...keep] } } });
  const r4 = await db.customer.deleteMany({ where: { isDemo: true, orders: { none: {} } } });
  const r5 = await db.category.deleteMany({ where: { isDemo: true, products: { none: {} }, children: { none: {} } } });
  await rm(path.join(process.cwd(), "public", "dummy"), { recursive: true, force: true });
  console.log({ orders: r1.count, reviews: r2.count, products: r3.count, archived: keep.size, customers: r4.count, categories: r5.count });
}

main().finally(() => db.$disconnect());
