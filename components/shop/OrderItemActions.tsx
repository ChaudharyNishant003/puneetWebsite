"use client";
import { useState, useTransition } from "react";
import { requestExchangeAction, submitReviewAction } from "@/app/actions/orders";
import { IconClose, IconStar } from "../icons";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full overflow-y-auto bg-white p-4 md:max-w-md md:rounded" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><p className="eyebrow text-sm">{title}</p><button onClick={onClose} aria-label="Close" className="p-1"><IconClose /></button></div>
        {children}
      </div>
    </div>
  );
}

export function ExchangeButton({ orderItemId, sizes, daysLeft, free }: { orderItemId: string; sizes: string[]; daysLeft: number; free: boolean }) {
  const [open, setOpen] = useState(false);
  const [defect, setDefect] = useState(false);
  const [size, setSize] = useState<string>("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const r = await requestExchangeAction({ orderItemId, isDefect: defect, newSize: defect ? undefined : size, reason: reason || (defect ? "" : `Size exchange to ${size}`) });
      if (r.ok) setDone(true);
      else setMsg(r.error ?? "Could not submit");
    });

  return (
    <>
      <button onClick={() => setOpen(true)} className="border border-dark px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">Exchange size</button>
      {open ? (
        <Modal title="Exchange" onClose={() => setOpen(false)}>
          {done ? (
            <div className="py-4 text-center text-sm">
              <p className="font-semibold">Request received ✓</p>
              <p className="mt-1 text-muted">We&apos;ll call you to arrange pickup, or bring the item to our store with your order number.</p>
              <button onClick={() => location.reload()} className="btn btn-dark mt-4">Done</button>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p className="text-xs text-muted">{daysLeft} day{daysLeft > 1 ? "s" : ""} left to exchange. {free ? "This exchange is free." : "Shipping is charged for a second exchange."}</p>
              <div className="flex gap-2">
                <button onClick={() => setDefect(false)} aria-pressed={!defect} className={`flex-1 border p-2 ${!defect ? "border-dark font-semibold" : "border-line"}`}>Wrong size</button>
                <button onClick={() => setDefect(true)} aria-pressed={defect} className={`flex-1 border p-2 ${defect ? "border-dark font-semibold" : "border-line"}`}>Defective / wrong item</button>
              </div>
              {!defect ? (
                <div>
                  <p className="label">New size</p>
                  {sizes.length ? (
                    <div className="flex flex-wrap gap-2">{sizes.map((s) => (<button key={s} onClick={() => setSize(s)} aria-pressed={size === s} className={`min-w-12 border px-3 py-2 ${size === s ? "border-dark bg-dark text-white" : "border-line-strong"}`}>{s}</button>))}</div>
                  ) : (
                    <p className="text-xs text-muted">Other sizes are out of stock right now. Call us and we&apos;ll help.</p>
                  )}
                </div>
              ) : null}
              <div>
                <label className="label" htmlFor="ex-reason">{defect ? "What's wrong? (a photo can be shared at pickup/store)" : "Anything else? (optional)"}</label>
                <textarea id="ex-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input" />
              </div>
              {msg ? <p className="text-danger">{msg}</p> : null}
              <button onClick={submit} disabled={pending || (!defect && !size) || (defect && reason.trim().length < 3)} className="btn btn-primary w-full">Request exchange</button>
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}

export function ReviewButton({ orderItemId, size }: { orderItemId: string; size: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button onClick={() => setOpen(true)} className="border border-line-strong px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">Write a review</button>
      {open ? (
        <Modal title="Your review" onClose={() => setOpen(false)}>
          {done ? (
            <div className="py-4 text-center text-sm">
              <p className="font-semibold">Thank you! ✓</p>
              <p className="mt-1 text-muted">Your review will appear after a quick check.</p>
              <button onClick={() => location.reload()} className="btn btn-dark mt-4">Done</button>
            </div>
          ) : (
            <form
              action={(fd) =>
                start(async () => {
                  fd.set("rating", String(rating));
                  fd.set("orderItemId", orderItemId);
                  const r = await submitReviewAction(fd);
                  if (r.ok) setDone(true);
                  else setMsg(r.error ?? "Could not submit");
                })
              }
              className="space-y-4 text-sm"
            >
              <div>
                <p className="label">Rating</p>
                <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (<button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star`} className={n <= rating ? "text-gold" : "text-line-strong"}><IconStar size={30} /></button>))}</div>
              </div>
              <fieldset>
                <legend className="label">How did size {size} fit?</legend>
                <div className="flex gap-2">
                  {[["SMALL", "Small"], ["TRUE", "True to size"], ["LARGE", "Large"]].map(([v, l]) => (
                    <label key={v} className="flex flex-1 items-center justify-center gap-1 border border-line p-2 text-xs has-[:checked]:border-dark has-[:checked]:font-semibold"><input type="radio" name="fit" value={v} className="sr-only" />{l}</label>
                  ))}
                </div>
              </fieldset>
              <div><label className="label" htmlFor="rv-title">Title (optional)</label><input id="rv-title" name="title" maxLength={80} className="input" /></div>
              <div><label className="label" htmlFor="rv-body">Review</label><textarea id="rv-body" name="body" rows={4} required minLength={5} className="input" placeholder="Fabric, colour, fit…" /></div>
              <div><label className="label" htmlFor="rv-photos">Photos (up to 3)</label><input id="rv-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="text-xs" /></div>
              {msg ? <p className="text-danger">{msg}</p> : null}
              <button disabled={pending || !rating} className="btn btn-primary w-full">{pending ? "Submitting…" : "Submit review"}</button>
            </form>
          )}
        </Modal>
      ) : null}
    </>
  );
}
