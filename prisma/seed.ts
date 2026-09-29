/* Dummy data seed. Every generated row carries isDemo=true so `npm run demo:purge` removes it before launch. */
import { PrismaClient, type Gender } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { categories, sizeCharts, templates, palette, localPincodes, reviewSnippets, reviewerNames } from "./dummy/catalog";
import { apparelGstRate } from "../lib/pricing";

const db = new PrismaClient();

// Deterministic PRNG so every seed produces the same catalogue.
let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const round9 = (n: number) => Math.max(99, Math.round(n / 50) * 50 - 1);
const stableSku = (slug: string) => `PG-${createHash("md5").update(slug).digest("hex").slice(0, 6).toUpperCase()}`;
const slugify = (t: string) => t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const IMG_DIR = path.join(process.cwd(), "public", "dummy");

function svg(name: string, colour: string, view: number) {
  const [a, b] = palette[colour] ?? ["#ddd", "#999"];
  const light = colour === "White" || colour === "Cream" || colour === "Beige" || colour === "Yellow";
  const fg = light ? "#3a3a3a" : "#ffffff";
  const views = ["Front", "Back", "Detail", "Styled"];
  const words = name.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 18) {
      lines.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  lines.push(cur.trim());
  const text = lines
    .slice(0, 3)
    .map((l, i) => `<text x="300" y="${560 + i * 40}" text-anchor="middle" font-family="Jost,Arial,sans-serif" font-size="30" font-weight="600" fill="${fg}">${l.replace(/&/g, "&amp;")}</text>`)
    .join("");
  // A simple garment silhouette so cards read as clothing, not blank tiles.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="600" height="800" fill="url(#g)"/>
<path d="M230 120 L300 150 L370 120 L450 170 L420 250 L390 235 L400 470 L200 470 L210 235 L180 250 L150 170 Z" fill="${fg}" fill-opacity="0.18" stroke="${fg}" stroke-opacity="0.35" stroke-width="3"/>
${text}
<text x="300" y="${560 + lines.slice(0, 3).length * 40 + 20}" text-anchor="middle" font-family="Jost,Arial,sans-serif" font-size="20" fill="${fg}" fill-opacity="0.8">${colour} · ${views[view % 4]} · Demo image</text>
</svg>`;
}

async function main() {
  console.log("Seeding dummy data…");
  await rm(IMG_DIR, { recursive: true, force: true });
  await mkdir(IMG_DIR, { recursive: true });

  // Size charts
  const chartIds: Record<string, string> = {};
  for (const [key, c] of Object.entries(sizeCharts)) {
    const row = await db.sizeChart.upsert({
      where: { id: `chart-${key}` },
      create: { id: `chart-${key}`, name: c.name, columns: [...c.columns], rows: c.rows as unknown as object, howToMeasure: c.howToMeasure, fitRule: c.fitRule },
      update: { name: c.name, columns: [...c.columns], rows: c.rows as unknown as object, howToMeasure: c.howToMeasure, fitRule: c.fitRule },
    });
    chartIds[key] = row.id;
  }

  // Categories
  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, gender: c.gender as Gender, sortOrder: i, isDemo: true, parentId: c.parent ? catIds[c.parent] : null, sizeChartId: c.chart ? chartIds[c.chart] : null },
      update: { name: c.name, sortOrder: i, parentId: c.parent ? catIds[c.parent] : null, sizeChartId: c.chart ? chartIds[c.chart] : null },
    });
    catIds[c.slug] = row.id;
  }

  // Products
  const productIds: string[] = [];
  for (const t of templates) {
    for (const [ni, baseName] of t.names.entries()) {
      const colours = [...t.colours].sort(() => rnd() - 0.5).slice(0, int(2, 3));
      const price = round9(int(t.price[0], t.price[1]));
      const mrp = round9(price * (1 + int(10, 30) / 100));
      const slug = slugify(baseName);
      const attrs: { key: string; value: string }[] = [];
      for (const [k, vals] of Object.entries(t.attrs)) attrs.push({ key: k, value: pick(vals) });
      if (t.set) attrs.push({ key: "set", value: t.set });
      if (!t.innerwear) {
        attrs.push({ key: "lining", value: pick(["No lining", "Cotton lining", "Lined"]) });
        attrs.push({ key: "sheer", value: pick(["Not see-through", "Slightly sheer in light colours"]) });
      }
      attrs.push({ key: "care", value: pick(["Cold hand wash", "Machine wash cold, gentle cycle", "Dry clean recommended"]) });
      if (t.gender === "WOMEN" && rnd() < 0.3) attrs.push({ key: "recipient", value: "Mother" });
      const fabric = attrs.find((a) => a.key === "fabric")?.value ?? "";
      const occasion = attrs.find((a) => a.key === "occasion")?.value ?? "";
      const catName = categories.find((c) => c.slug === t.cat)!.name;
      const badges: string[] = [];
      if (ni === 0) badges.push("Bestseller");
      else if (rnd() < 0.2) badges.push("New");
      if (occasion === "Festive" && rnd() < 0.5) badges.push("Festive");

      const images: { url: string; alt: string; colour: string; sortOrder: number }[] = [];
      for (const colour of colours) {
        for (let v = 0; v < (colour === colours[0] ? 4 : 2); v++) {
          const file = `${slug}-${slugify(colour)}-${v}.svg`;
          await writeFile(path.join(IMG_DIR, file), svg(baseName, colour, v));
          images.push({ url: `/dummy/${file}`, alt: `${baseName} in ${colour}, ${["front", "back", "detail", "styled"][v]} view`, colour, sortOrder: images.length });
        }
      }

      const variants = colours.flatMap((colour, ci) =>
        t.sizes.map((size, si) => ({
          size,
          colour,
          colourHex: (palette[colour] ?? ["#999", "#999"])[1],
          sku: `${stableSku(slug)}-${slugify(colour).slice(0, 3).toUpperCase()}-${size.replace(/\W/g, "")}`,
          stock: rnd() < 0.12 ? 0 : int(1, 25),
          sortOrder: ci * 100 + si,
        })),
      );

      const searchText = [baseName, catName, t.gender, fabric, occasion, ...colours, ...attrs.map((a) => a.value), ...badges].join(" ").toLowerCase();

      const data = {
        name: baseName,
        description: `${baseName} from our store's ${catName.toLowerCase()} collection. ${fabric ? `Made in ${fabric.toLowerCase()} that feels comfortable all day.` : ""} ${occasion ? `A good pick for ${occasion.toLowerCase()} wear.` : ""} This is demo content; the real product description will replace it.`.replace(/\s+/g, " ").trim(),
        categoryId: catIds[t.cat],
        gender: t.gender as Gender,
        price,
        mrp,
        hsn: t.innerwear ? "6108" : "6211",
        gstRate: apparelGstRate(price),
        badges,
        modelInfo: t.gender === "KIDS" || t.innerwear || t.cat === "sarees" ? null : t.gender === "WOMEN" ? `Model is 5'4" and wearing M` : `Model is 5'11" and wearing L`,
        isExchangeable: !t.innerwear,
        isInnerwear: !!t.innerwear,
        isFeatured: rnd() < 0.25,
        storeBestseller: ni < 2,
        searchText,
        soldCount: int(0, 120),
        isDemo: true,
      };

      const p = await db.product.upsert({
        where: { slug },
        create: { slug, sku: stableSku(slug), ...data },
        update: { ...data, sku: stableSku(slug) },
      });
      await db.productAttribute.deleteMany({ where: { productId: p.id } });
      await db.productAttribute.createMany({ data: attrs.map((a) => ({ ...a, productId: p.id })) });
      await db.productImage.deleteMany({ where: { productId: p.id } });
      await db.productImage.createMany({ data: images.map((im) => ({ ...im, productId: p.id })) });
      for (const v of variants) {
        await db.variant.upsert({
          where: { productId_size_colour: { productId: p.id, size: v.size, colour: v.colour } },
          create: { ...v, productId: p.id },
          update: { stock: v.stock, colourHex: v.colourHex, sku: v.sku },
        });
      }
      productIds.push(p.id);
    }
  }
  console.log(`  ${productIds.length} products`);

  // Demo customers
  const customers = [];
  for (let i = 0; i < 12; i++) {
    const phone = `98${String(10000000 + i * 7919).slice(0, 8)}`;
    customers.push(
      await db.customer.upsert({
        where: { phone },
        create: { phone, name: `${reviewerNames[i]} Demo`, email: `demo${i}@example.com`, isDemo: true },
        update: {},
      }),
    );
  }

  // Reviews (approved demo reviews, not tied to orders)
  await db.review.deleteMany({ where: { isDemo: true } });
  let reviewCount = 0;
  for (const pid of productIds) {
    const n = int(0, 4);
    const p = await db.product.findUniqueOrThrow({ where: { id: pid }, include: { variants: true } });
    for (let i = 0; i < n; i++) {
      const snip = pick(reviewSnippets);
      await db.review.create({
        data: {
          productId: pid,
          customerId: pick(customers).id,
          authorName: pick(reviewerNames),
          rating: snip.rating,
          fit: snip.body.includes("bada") ? "LARGE" : snip.body.includes("tight") ? "SMALL" : "TRUE",
          sizeBought: pick(p.variants).size,
          title: snip.title,
          body: snip.body,
          photos: rnd() < 0.3 ? [pick(await db.productImage.findMany({ where: { productId: pid } })).url] : [],
          verified: true,
          status: "APPROVED",
          isDemo: true,
          createdAt: new Date(Date.now() - int(2, 120) * 86400_000),
        },
      });
      reviewCount++;
    }
    const agg = await db.review.aggregate({ where: { productId: pid, status: "APPROVED" }, _avg: { rating: true }, _count: true });
    await db.product.update({ where: { id: pid }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
  }
  console.log(`  ${reviewCount} reviews`);

  // Pincodes
  for (const code of localPincodes) {
    await db.pincode.upsert({
      where: { code },
      create: { code, city: "[City]", state: "Rajasthan", isLocal: true, localFee: code.startsWith("302") ? 0 : 49, localEtaDays: code.startsWith("302") ? 1 : 2, codAllowed: true },
      update: {},
    });
  }
  // A few non-local pincodes where COD is blocked (tests the COD rule)
  for (const code of ["190001", "795001"]) {
    await db.pincode.upsert({ where: { code }, create: { code, isLocal: false, codAllowed: false }, update: {} });
  }

  // Coupons
  const coupons = [
    { code: "WELCOME10", description: "₹100 off on your first order above ₹999", type: "FLAT" as const, value: 100, minCart: 999, firstOrderOnly: true },
    { code: "PREPAID5", description: "Extra 5% off on prepaid orders (max ₹200)", type: "PERCENT" as const, value: 5, minCart: 0, maxDiscount: 200, prepaidOnly: true },
    { code: "FESTIVE200", description: "₹200 off on orders above ₹2,499", type: "FLAT" as const, value: 200, minCart: 2499 },
  ];
  for (const c of coupons) await db.coupon.upsert({ where: { code: c.code }, create: c, update: c });

  // Search synonyms (admin-editable, on top of the built-in list)
  for (const [term, expandsTo] of Object.entries({ lehnga: ["lehenga"], lehanga: ["lehenga"], salwar: ["suit set", "kurta set"], jeens: ["jeans"], tshirt: ["t-shirt"] })) {
    await db.searchSynonym.upsert({ where: { term }, create: { term, expandsTo }, update: { expandsTo } });
  }

  // CMS
  const cms: Record<string, unknown> = {
    announcement: { text: "Free first size exchange · COD available · Free shipping above ₹999", link: "/pages/exchange-policy" },
    hero: { title: "The Festive Edit", subtitle: "Diwali aur shaadi ke liye, poore parivaar ke liye", cta: "Shop Now", href: "/c/occasion-festive", from: "#C9727A", to: "#8E1B3A" },
    rails: [
      { title: "Bestsellers in Our Store", subtitle: "Jo dukaan mein sabse zyada bik raha hai", source: "storeBestseller" },
      { title: "New Arrivals", subtitle: "Is hafte dukaan mein aaya", source: "new" },
    ],
  };
  for (const [key, content] of Object.entries(cms)) await db.cmsBlock.upsert({ where: { key }, create: { key, content: content as object }, update: {} });

  // Admin users — test credentials come from env (defaults documented in .env.example)
  const owner = process.env.SEED_OWNER_EMAIL ?? "owner@puneet.test";
  const staff = process.env.SEED_STAFF_EMAIL ?? "staff@puneet.test";
  const pw = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#2026";
  const h = await hash(pw);
  await db.adminUser.upsert({ where: { email: owner }, create: { email: owner, name: "Owner (demo)", passwordHash: h, role: "OWNER" }, update: {} });
  await db.adminUser.upsert({ where: { email: staff }, create: { email: staff, name: "Staff (demo)", passwordHash: h, role: "STAFF" }, update: {} });

  // Demo orders across statuses
  await db.order.deleteMany({ where: { isDemo: true } });
  const statuses = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED", "RTO"] as const;
  const allVariants = await db.variant.findMany({ include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } });
  for (let i = 0; i < 25; i++) {
    const c = pick(customers);
    const status = pick(statuses);
    const items = Array.from({ length: int(1, 3) }, () => pick(allVariants));
    const subtotal = items.reduce((sum, v) => sum + v.product.price, 0);
    const method = rnd() < 0.55 ? "COD" : "PREPAID";
    const local = rnd() < 0.4;
    const created = new Date(Date.now() - int(0, 40) * 86400_000 - int(0, 86400) * 1000);
    const shippingFee = local || subtotal >= 999 ? 0 : 79;
    const prepaidDiscount = method === "PREPAID" ? Math.min(Math.floor(subtotal * 0.05), 150) : 0;
    await db.order.create({
      data: {
        number: `PG${created.toISOString().slice(2, 10).replace(/-/g, "")}${String(i).padStart(3, "0")}`,
        customerId: c.id,
        status,
        paymentMethod: method,
        paymentStatus: method === "PREPAID" ? "PAID" : status === "DELIVERED" ? "COD_COLLECTED" : "COD_PENDING",
        deliveryMode: local ? "LOCAL" : "COURIER",
        subtotal,
        prepaidDiscount,
        shippingFee,
        total: subtotal - prepaidDiscount + shippingFee,
        taxTotal: Math.round(subtotal * 0.05 / 1.05),
        shipName: c.name ?? "Demo",
        shipPhone: c.phone,
        shipLine1: `${int(1, 200)}, Demo Colony`,
        shipCity: local ? "[City]" : pick(["Delhi", "Mumbai", "Indore", "Lucknow", "Ahmedabad"]),
        shipState: local ? "Rajasthan" : pick(["Delhi", "Maharashtra", "Madhya Pradesh", "Uttar Pradesh", "Gujarat"]),
        shipPincode: local ? pick(localPincodes) : pick(["110001", "400001", "452001", "226001", "380001"]),
        email: c.email,
        isDemo: true,
        placedAt: created,
        deliveredAt: status === "DELIVERED" ? new Date(created.getTime() + 3 * 86400_000) : null,
        createdAt: created,
        items: {
          create: items.map((v) => ({
            variantId: v.id,
            productName: v.product.name,
            productSlug: v.product.slug,
            size: v.size,
            colour: v.colour,
            sku: v.sku,
            image: v.product.images[0]?.url,
            hsn: v.product.hsn,
            gstRate: v.product.gstRate,
            unitPrice: v.product.price,
            mrp: v.product.mrp,
            qty: 1,
            isExchangeable: v.product.isExchangeable,
          })),
        },
        events: { create: [{ status: "PLACED", actor: "system", createdAt: created }, ...(status !== "PLACED" ? [{ status, actor: "system" }] : [])] },
      },
    });
  }
  console.log("  25 orders");
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
