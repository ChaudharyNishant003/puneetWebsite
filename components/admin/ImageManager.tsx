"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteImageAction, moveImageAction, removeVideoAction, uploadImagesAction } from "@/app/actions/admin-products";

export function ImageManager({ productId, images, colours, videoUrl }: { productId: string; images: { id: string; url: string; colour: string | null }[]; colours: string[]; videoUrl: string | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string | null }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : r.error ?? "Failed");
      router.refresh();
    });

  return (
    <section className="border border-line bg-white p-4">
      <h2 className="text-sm font-semibold">Photos & video</h2>
      <p className="mt-1 text-xs text-muted">Phone photos are fine: plain wall, daylight, front / back / close-up of fabric / worn. First photo of each colour is the main one. Large files are resized automatically.</p>
      <form action={(fd) => run(() => uploadImagesAction(fd))} className="mt-3 flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="productId" value={productId} />
        <div>
          <label className="label" htmlFor="img-colour">For colour</label>
          <select id="img-colour" name="colour" className="input w-40 py-1.5"><option value="">All colours</option>{colours.map((c) => (<option key={c}>{c}</option>))}</select>
        </div>
        <input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,video/mp4" capture="environment" className="text-xs" required />
        <button disabled={pending} className="btn btn-dark py-2">{pending ? "Uploading…" : "Upload"}</button>
      </form>
      {msg ? <p className="mt-2 text-sm text-danger">{msg}</p> : null}
      {videoUrl ? (
        <div className="mt-3 flex items-center gap-3 text-xs"><video src={videoUrl} className="h-24 rounded" muted /> <button onClick={() => run(() => removeVideoAction(productId))} className="text-danger underline">Remove video</button></div>
      ) : null}
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {images.map((im, i) => (
          <li key={im.id} className="text-xs">
            <img src={im.url} alt="" className="aspect-[3/4] w-full rounded object-cover" />
            <p className="mt-1 truncate text-muted">{im.colour ?? "All colours"}</p>
            <div className="flex gap-2">
              <button disabled={pending || i === 0} onClick={() => run(() => moveImageAction(im.id, -1))} aria-label="Move earlier">←</button>
              <button disabled={pending || i === images.length - 1} onClick={() => run(() => moveImageAction(im.id, 1))} aria-label="Move later">→</button>
              <button disabled={pending} onClick={() => { if (confirm("Delete this photo?")) run(() => deleteImageAction(im.id)); }} className="ml-auto text-danger">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
