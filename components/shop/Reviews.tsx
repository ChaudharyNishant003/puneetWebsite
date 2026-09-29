import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { IconStar } from "../icons";

export async function Reviews({ productId, ratingAvg, ratingCount }: { productId: string; ratingAvg: number; ratingCount: number }) {
  const [reviews, dist, fit] = await Promise.all([
    db.review.findMany({ where: { productId, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.review.groupBy({ by: ["rating"], where: { productId, status: "APPROVED" }, _count: true }),
    db.review.groupBy({ by: ["fit"], where: { productId, status: "APPROVED", fit: { not: null } }, _count: true }),
  ]);
  const fitTotal = fit.reduce((s, f) => s + f._count, 0);
  const fitPct = (k: string) => (fitTotal ? Math.round(((fit.find((f) => f.fit === k)?._count ?? 0) / fitTotal) * 100) : 0);
  const photos = reviews.flatMap((r) => r.photos).slice(0, 8);

  return (
    <section id="reviews" className="mt-10 scroll-mt-28 px-4 md:ml-auto md:w-[47%] md:px-0">
      <h2 className="eyebrow mb-4 text-[15px]">Ratings & Reviews</h2>
      {ratingCount === 0 ? (
        <p className="text-sm text-muted">No reviews yet. Bought this? You can review it from your orders after delivery.</p>
      ) : (
        <>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-4xl font-semibold">{ratingAvg.toFixed(1)}</p>
              <p className="flex justify-center text-save">{Array.from({ length: 5 }, (_, i) => (<IconStar key={i} size={13} className={i < Math.round(ratingAvg) ? "" : "opacity-25"} />))}</p>
              <p className="mt-1 text-xs text-muted">{ratingCount} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = dist.find((d) => d.rating === n)?._count ?? 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-3">{n}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-line"><div className="h-full bg-save" style={{ width: `${ratingCount ? (c / ratingCount) * 100 : 0}%` }} /></div>
                    <span className="w-5 text-right text-muted">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {fitTotal ? (
            <div className="mt-5">
              <p className="mb-1.5 text-xs font-semibold">How it fits</p>
              <div className="flex gap-1 text-center text-[11px]">
                {[["SMALL", "Runs small"], ["TRUE", "True to size"], ["LARGE", "Runs large"]].map(([k, l]) => (
                  <div key={k} className="flex-1">
                    <div className={`mb-1 h-1.5 rounded ${fitPct(k) >= 50 ? "bg-save" : "bg-line"}`} />
                    {l} <span className="text-muted">{fitPct(k)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {photos.length ? (
            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
              {photos.map((ph, i) => (<img key={i} src={ph} alt="Customer photo" loading="lazy" className="h-24 w-18 shrink-0 rounded object-cover" />))}
            </div>
          ) : null}
          <ul className="mt-4 divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-4 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 rounded-sm bg-save px-1.5 py-0.5 text-[11px] font-semibold text-white">{r.rating} <IconStar size={9} /></span>
                  {r.title ? <span className="font-semibold">{r.title}</span> : null}
                </div>
                <p className="mt-1.5 leading-relaxed">{r.body}</p>
                {r.photos.length ? (<div className="mt-2 flex gap-2">{r.photos.map((ph, i) => (<img key={i} src={ph} alt="" loading="lazy" className="h-16 w-12 rounded object-cover" />))}</div>) : null}
                <p className="mt-1.5 text-[11px] text-muted">
                  {r.authorName}
                  {r.sizeBought ? ` · Bought ${r.sizeBought}` : ""}
                  {r.fit ? ` · ${r.fit === "TRUE" ? "True to size" : r.fit === "SMALL" ? "Runs small" : "Runs large"}` : ""}
                  {r.verified ? <span className="text-save"> · ✓ Verified buyer</span> : null} · {fmtDate(r.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
