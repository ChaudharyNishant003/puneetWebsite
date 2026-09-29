"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { addOrderNoteAction, markRefundedAction, setOrderStatusAction, shipOrderAction, unblockCodAction } from "@/app/actions/admin-orders";
import { statusLabel } from "@/lib/format";

type Can = { courier: boolean; localDelivery: boolean; manualAwb: boolean; cancel: boolean; notes: boolean };

export function OrderActions({ orderId, status, next, deliveryMode, paid, can }: { orderId: string; status: OrderStatus; next: OrderStatus[]; deliveryMode: "LOCAL" | "COURIER"; paid: boolean; can: Can }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [manual, setManual] = useState({ courier: "", awb: "" });
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Failed");
      router.refresh();
    });
  };

  const shippable = status === "CONFIRMED" || status === "PACKED";
  const canShip = shippable && (deliveryMode === "LOCAL" ? can.localDelivery : can.courier);
  return (
    <section className="border border-line bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">Actions</h2>
      <div className="flex flex-wrap gap-2">
        {next.filter((s) => s !== "CANCELLED").map((s) => (
          <button key={s} disabled={pending} onClick={() => run(() => setOrderStatusAction(orderId, s))} className="btn btn-dark py-2">Mark {statusLabel[s]}</button>
        ))}
        {canShip ? (
          <button disabled={pending} onClick={() => run(() => shipOrderAction(orderId))} className="btn btn-primary py-2">
            {deliveryMode === "LOCAL" ? "Send out for local delivery" : "Book courier & ship"}
          </button>
        ) : null}
        {next.includes("CANCELLED") && can.cancel ? (
          <button disabled={pending} onClick={() => run(() => setOrderStatusAction(orderId, "CANCELLED", "Cancelled by store"), "Cancel this order? Stock will be returned.")} className="btn btn-outline py-2 text-danger">Cancel order</button>
        ) : null}
        {can.cancel && paid && (status === "CANCELLED" || status === "RTO") ? (
          <button disabled={pending} onClick={() => run(() => markRefundedAction(orderId), "Mark as refunded? Do this after sending the refund from Razorpay.")} className="btn btn-outline py-2">Mark refunded</button>
        ) : null}
      </div>
      {shippable && deliveryMode === "COURIER" && can.manualAwb ? (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-muted">Shipped outside the system? Enter courier & AWB</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={manual.courier} onChange={(e) => setManual({ ...manual, courier: e.target.value })} placeholder="Courier" className="input w-40 py-1.5" />
            <input value={manual.awb} onChange={(e) => setManual({ ...manual, awb: e.target.value })} placeholder="AWB number" className="input w-44 py-1.5" />
            <button disabled={pending || !manual.courier || !manual.awb} onClick={() => run(() => shipOrderAction(orderId, manual))} className="btn btn-outline py-1.5">Save & mark shipped</button>
          </div>
        </details>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-danger" role="alert">{msg}</p> : null}
      {can.notes ? <form onSubmit={(e) => { e.preventDefault(); run(() => addOrderNoteAction(orderId, note)); setNote(""); }} className="mt-4 flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal note (e.g. customer called)" className="input py-2" />
        <button disabled={pending || !note.trim()} className="btn btn-outline py-2">Add</button>
      </form> : null}
    </section>
  );
}

export function UnblockCod({ customerId }: { customerId: string }) {
  const [done, setDone] = useState(false);
  return done ? (
    <p className="mt-2 text-xs text-save">COD re-enabled</p>
  ) : (
    <button onClick={async () => { await unblockCodAction(customerId); setDone(true); }} className="mt-2 text-xs text-brand underline">Re-enable COD for this customer</button>
  );
}
