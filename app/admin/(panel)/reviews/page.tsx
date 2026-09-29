import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { requirePage } from "@/lib/flags";
import { fmtDateTime } from "@/lib/format";
import { setReviewStatusAction } from "@/app/actions/admin-orders";
import { ActionButton } from "@/components/admin/ActionForm";

export const metadata = { title: "Reviews" };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  await requirePage("reviews");
  const status = ((await searchParams).status ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED";
  const list = await db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { name: true, slug: true } } } });
  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">Reviews</h1>
      <div className="mb-3 flex gap-1">{(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (<Link key={s} href={`/admin/reviews?status=${s}`} className={`rounded px-3 py-1.5 text-xs ${status === s ? "bg-dark text-white" : "bg-white"}`}>{s[0] + s.slice(1).toLowerCase()}</Link>))}</div>
      <p className="mb-3 text-xs text-muted">Approve honest reviews, including critical ones. Reject only spam, abuse or personal details.</p>
      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.id} className="border border-line bg-white p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <Link href={`/p/${r.product.slug}`} target="_blank" className="font-medium text-brand">{r.product.name}</Link>
              <span className="text-xs text-muted">{fmtDateTime(r.createdAt)} · {r.authorName}{r.verified ? " · verified buyer" : ""}</span>
            </div>
            <p className="mt-1">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.fit ? <span className="text-xs text-muted">· fit: {r.fit.toLowerCase()} · size {r.sizeBought}</span> : null}</p>
            {r.title ? <p className="mt-1 font-semibold">{r.title}</p> : null}
            <p className="mt-1">{r.body}</p>
            {r.photos.length ? <div className="mt-2 flex gap-2">{r.photos.map((p) => (<img key={p} src={p} alt="" className="h-20 w-15 rounded object-cover" />))}</div> : null}
            <div className="mt-3 flex gap-3">
              {status !== "APPROVED" ? <ActionButton action={setReviewStatusAction.bind(null, r.id, "APPROVED")} className="btn btn-dark py-1.5">Approve</ActionButton> : null}
              {status !== "REJECTED" ? <ActionButton action={setReviewStatusAction.bind(null, r.id, "REJECTED")} className="btn btn-outline py-1.5 text-danger">Reject</ActionButton> : null}
            </div>
          </li>
        ))}
        {!list.length ? <li className="py-8 text-center text-sm text-muted">Nothing here</li> : null}
      </ul>
    </div>
  );
}
