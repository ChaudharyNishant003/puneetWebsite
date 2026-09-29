import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { inr } from "@/lib/format";
import { CsvImport } from "@/components/admin/CsvImport";

export const metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; status?: string; stock?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const and: Prisma.ProductWhereInput[] = [];
  if (sp.q) and.push({ OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }] });
  if (sp.cat) and.push({ OR: [{ category: { slug: sp.cat } }, { category: { parent: { slug: sp.cat } } }] });
  if (sp.status) and.push({ status: sp.status as ProductStatus });
  if (sp.stock === "low") and.push({ variants: { some: { stock: { lte: 3 } } } });
  const where: Prisma.ProductWhereInput = { AND: and };
  const [products, cats] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200, include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { select: { stock: true } } } }),
    db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Products <span className="text-sm font-normal text-muted">({products.length})</span></h1>
        <div className="flex gap-2">
          <a href="/api/admin/products-csv" className="btn btn-outline py-2">Export CSV</a>
          <Link href="/admin/products/new" className="btn btn-primary py-2">+ Add product</Link>
        </div>
      </div>
      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Name or SKU" className="input w-52 py-2" />
        <select name="cat" defaultValue={sp.cat ?? ""} className="input w-40 py-2"><option value="">All categories</option>{cats.map((c) => (<option key={c.id} value={c.slug}>{c.name}</option>))}</select>
        <select name="status" defaultValue={sp.status ?? ""} className="input w-36 py-2"><option value="">Any status</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        <select name="stock" defaultValue={sp.stock ?? ""} className="input w-36 py-2"><option value="">Any stock</option><option value="low">Low / sold out</option></select>
        <button className="btn btn-dark py-2">Filter</button>
      </form>
      <CsvImport />
      <div className="overflow-x-auto border border-line bg-white">
        <table className="tbl min-w-[680px]">
          <thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              const out = p.variants.filter((v) => v.stock === 0).length;
              return (
                <tr key={p.id}>
                  <td className="w-12">{p.images[0] ? <img src={p.images[0].url} alt="" className="h-12 w-9 rounded object-cover" /> : <span className="block h-12 w-9 rounded bg-line" />}</td>
                  <td><Link href={`/admin/products/${p.id}`} className="font-medium text-brand">{p.name}</Link><br /><span className="text-xs text-muted">{p.sku}{p.isDemo ? " · demo" : ""}{p.isInnerwear ? " · innerwear" : ""}</span></td>
                  <td className="text-xs">{p.category.name}</td>
                  <td>{inr(p.price)}<br /><s className="text-xs text-muted">{inr(p.mrp)}</s></td>
                  <td className={stock === 0 ? "font-semibold text-danger" : ""}>{stock}{out ? <span className="block text-xs text-muted">{out} sold out</span> : null}</td>
                  <td className="text-xs">{p.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
