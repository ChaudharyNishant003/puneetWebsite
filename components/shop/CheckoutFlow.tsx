"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { confirmPaymentAction, mockPayAction, paymentFailedAction, placeOrderAction, quoteAction, sendCodOtpAction } from "@/app/actions/checkout";
import { inr } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/constants";
import { IconCash, IconLock } from "../icons";
import { LoginForm } from "./LoginForm";

type Addr = { id?: string; name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
type Item = { id: string; name: string; size: string; colour: string; qty: number; price: number; image: string | null; isExchangeable: boolean };
type Quote = Extract<Awaited<ReturnType<typeof quoteAction>>, { ok: true }>;

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

const empty: Addr = { name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };

export function CheckoutFlow(props: { loggedIn: boolean; phone: string | null; name: string; email: string; addresses: Addr[]; items: Item[]; initialSubtotal: number; mockPayments: boolean }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | "new">(props.addresses[0]?.id ?? "new");
  const [form, setForm] = useState<Addr>({ ...empty, name: props.name, phone: props.phone ?? "" });
  const [email, setEmail] = useState(props.email);
  const [method, setMethod] = useState<"PREPAID" | "COD">("PREPAID");
  const [quote, setQuote] = useState<(Quote & { forKey: string }) | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [codOtp, setCodOtp] = useState("");
  const [codOtpSent, setCodOtpSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mock, setMock] = useState<null | { providerOrderId: string; orderNumber: string; amount: number }>(null);

  const addr: Addr = selectedId === "new" ? form : (props.addresses.find((a) => a.id === selectedId) ?? form);
  const pin = addr.pincode;

  // The total shown must be the total for the current pincode + payment method; placing an order
  // with a stale quote (e.g. right after switching to COD) would be rejected by the server.
  const quoteKey = `${pin}|${method}`;
  const refreshQuote = useCallback(async () => {
    if (!props.loggedIn || !/^\d{6}$/.test(pin)) return setQuote(null);
    const key = `${pin}|${method}`;
    const q = await quoteAction(pin, method);
    if (!q.ok) return setQuoteErr(q.error ?? "Could not get delivery details");
    setQuoteErr(null);
    setQuote({ ...q, forKey: key });
    if (method === "COD" && !q.cod.allowed) setMethod("PREPAID");
  }, [pin, method, props.loggedIn]);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  // After logging in on this page, prefill the delivery phone/name from the account.
  useEffect(() => {
    if (props.phone) setForm((f) => ({ ...f, phone: f.phone || props.phone!, name: f.name || props.name }));
  }, [props.phone, props.name]);

  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsCodOtp = method === "COD" && addr.phone !== props.phone;

  const place = () =>
    start(async () => {
      setError(null);
      if (!quote) return setError("Enter a valid delivery pincode");
      const r = await placeOrderAction({
        address: { ...addr, email },
        saveAddress: selectedId === "new",
        paymentMethod: method,
        codOtp: codOtp || undefined,
        quotedTotal: quote.pricing.total,
      });
      if (!r.ok) {
        setError(r.error);
        if (r.code === "PRICE_CHANGED") refreshQuote();
        if (r.code === "COD_OTP_REQUIRED" && !codOtpSent) sendCod();
        return;
      }
      if (r.kind === "COD") return router.push(`/order/${r.orderNumber}?placed=1`);
      if (r.payment.provider === "mock") return setMock({ providerOrderId: r.payment.orderId, orderNumber: r.orderNumber, amount: r.payment.amount / 100 });
      openRazorpay(r.orderNumber, r.payment);
    });

  const openRazorpay = (orderNumber: string, p: { orderId: string; amount: number; keyId: string | null; name: string; phone: string; email?: string }) => {
    if (!window.Razorpay) return setError("Payment window could not load. Check your internet and try again.");
    const rzp = new window.Razorpay({
      key: p.keyId,
      amount: p.amount,
      currency: "INR",
      order_id: p.orderId,
      name: "Puneet Garments",
      description: `Order ${orderNumber}`,
      prefill: { name: p.name, contact: `+91${p.phone}`, email: p.email },
      config: { display: { preferences: { show_default_blocks: true } } },
      theme: { color: "#8e1b3a" },
      handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        start(async () => {
          const c = await confirmPaymentAction({ providerOrderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
          if (c.ok) router.push(`/order/${c.orderNumber}?placed=1`);
          else setError(c.error);
        }),
      modal: {
        ondismiss: () =>
          start(async () => {
            const f = await paymentFailedAction(p.orderId);
            setError(f.error);
            refreshQuote();
          }),
      },
    });
    rzp.open();
  };

  const sendCod = () =>
    start(async () => {
      const r = await sendCodOtpAction(addr.phone);
      if (!r.ok) return setError(r.error);
      setCodOtpSent(r.devCode ?? "sent");
    });

  const mockPay = (ok: boolean) =>
    start(async () => {
      if (!mock) return;
      const r = await mockPayAction(mock.providerOrderId, ok);
      if (r.ok) router.push(`/order/${r.orderNumber}?placed=1`);
      else {
        setMock(null);
        setError(r.error);
        refreshQuote();
      }
    });

  const quoteFresh = quote?.forKey === quoteKey;
  const p = quote?.pricing;
  const itemCount = props.items.reduce((s, i) => s + i.qty, 0);
  const eta = quote?.etaDate ? new Date(quote.etaDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }) : null;

  return (
    <div className="md:grid md:grid-cols-[1.3fr_1fr] md:gap-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="space-y-4">
        {/* 1. Login */}
        <section className="border border-line p-4">
          <h2 className="eyebrow mb-3 text-sm">1. Mobile number</h2>
          {props.loggedIn ? (
            <p className="text-sm">+91 {props.phone} <span className="text-save">✓ verified</span></p>
          ) : (
            <LoginForm onDone={() => router.refresh()} />
          )}
        </section>

        {/* 2. Address */}
        <section className={`border border-line p-4 ${props.loggedIn ? "" : "pointer-events-none opacity-50"}`}>
          <h2 className="eyebrow mb-3 text-sm">2. Delivery address</h2>
          {props.addresses.length ? (
            <div className="mb-3 space-y-2">
              {props.addresses.map((a) => (
                <label key={a.id} className={`flex cursor-pointer gap-3 border p-3 text-sm ${selectedId === a.id ? "border-dark" : "border-line"}`}>
                  <input type="radio" name="addr" checked={selectedId === a.id} onChange={() => setSelectedId(a.id!)} className="mt-1 accent-[var(--brand)]" />
                  <span><b>{a.name}</b> · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</span>
                </label>
              ))}
              <label className={`flex cursor-pointer gap-3 border p-3 text-sm ${selectedId === "new" ? "border-dark" : "border-line"}`}>
                <input type="radio" name="addr" checked={selectedId === "new"} onChange={() => setSelectedId("new")} className="accent-[var(--brand)]" /> Add a new address
              </label>
            </div>
          ) : null}
          {selectedId === "new" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="a-pin">Pincode</label><input id="a-pin" className="input" inputMode="numeric" autoComplete="postal-code" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} /></div>
              <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="a-name">Full name</label><input id="a-name" className="input" autoComplete="name" value={form.name} onChange={set("name")} /></div>
              <div className="col-span-2"><label className="label" htmlFor="a-l1">House / flat, street</label><input id="a-l1" className="input" autoComplete="address-line1" value={form.line1} onChange={set("line1")} /></div>
              <div className="col-span-2"><label className="label" htmlFor="a-l2">Area / colony (optional)</label><input id="a-l2" className="input" autoComplete="address-line2" value={form.line2} onChange={set("line2")} /></div>
              <div className="col-span-2"><label className="label" htmlFor="a-lm">Landmark (optional)</label><input id="a-lm" className="input" value={form.landmark} onChange={set("landmark")} /></div>
              <div><label className="label" htmlFor="a-city">City</label><input id="a-city" className="input" autoComplete="address-level2" value={form.city} onChange={set("city")} /></div>
              <div>
                <label className="label" htmlFor="a-state">State</label>
                <select id="a-state" className="input" autoComplete="address-level1" value={form.state} onChange={set("state")}>
                  <option value="">Select</option>
                  {INDIAN_STATES.map((s) => (<option key={s}>{s}</option>))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="a-phone">Delivery phone</label><input id="a-phone" className="input" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} /></div>
              <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="a-email">Email for invoice (optional)</label><input id="a-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
          ) : null}
          {quoteErr ? <p className="mt-2 text-sm text-danger">{quoteErr}</p> : null}
          {quote ? (
            quote.serviceable ? (
              <p className="mt-3 text-sm">🚚 Delivery by <b className="text-save">{eta}</b>{quote.mode === "LOCAL" ? " · by our store team" : ""}</p>
            ) : (
              <p className="mt-3 text-sm text-danger">{quote.deliveryMessage ?? "We don't deliver to this pincode yet"}</p>
            )
          ) : null}
        </section>

        {/* 3. Payment */}
        <section className={`border border-line p-4 ${props.loggedIn && quote?.serviceable ? "" : "pointer-events-none opacity-50"}`}>
          <h2 className="eyebrow mb-3 text-sm">3. Payment</h2>
          <label className={`flex cursor-pointer gap-3 border p-3 text-sm ${method === "PREPAID" ? "border-dark" : "border-line"}`}>
            <input type="radio" name="pay" checked={method === "PREPAID"} onChange={() => setMethod("PREPAID")} className="mt-1 accent-[var(--brand)]" />
            <span className="flex-1">
              <b>UPI / Card / Netbanking</b>
              {quote?.prepaidSaving ? <span className="ml-2 bg-brand-soft px-1.5 py-0.5 text-xs font-semibold text-brand">Save {inr(quote.prepaidSaving)}</span> : null}
              <br /><span className="text-xs text-muted">GPay, PhonePe, Paytm, any UPI app or card</span>
            </span>
            <IconLock className="text-muted" />
          </label>
          <label className={`mt-2 flex gap-3 border p-3 text-sm ${quote && !quote.cod.allowed ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${method === "COD" ? "border-dark" : "border-line"}`}>
            <input type="radio" name="pay" disabled={!!quote && !quote.cod.allowed} checked={method === "COD"} onChange={() => setMethod("COD")} className="mt-1 accent-[var(--brand)]" />
            <span className="flex-1">
              <b>Cash on Delivery</b>
              <br /><span className="text-xs text-muted">{quote && !quote.cod.allowed ? quote.cod.reason : "Pay in cash or UPI when it arrives"}</span>
            </span>
            <IconCash className="text-muted" />
          </label>
          {method === "COD" && needsCodOtp ? (
            <div className="mt-3 bg-surface p-3 text-sm">
              <p>The delivery phone is different from your login number, so we&apos;ll confirm it with an OTP.</p>
              {codOtpSent ? (
                <>
                  <input value={codOtp} onChange={(e) => setCodOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder={`OTP sent to ${addr.phone}`} aria-label="COD OTP" className="input mt-2 tracking-[0.3em]" />
                  {codOtpSent !== "sent" ? <p className="mt-1 text-xs">Test mode OTP: <b>{codOtpSent}</b></p> : null}
                </>
              ) : (
                <button type="button" onClick={sendCod} disabled={pending} className="btn btn-outline mt-2">Send OTP to {addr.phone || "delivery phone"}</button>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* Summary */}
      <aside className="mt-4 md:mt-0">
        <div className="border border-line p-4 md:sticky md:top-28">
          <h2 className="eyebrow mb-3 text-sm">Order summary ({itemCount})</h2>
          <ul className="mb-3 space-y-3">
            {props.items.map((i) => (
              <li key={i.id} className="flex gap-3 text-sm">
                {i.image ? <img src={i.image} alt="" width={48} height={64} className="h-16 w-12 rounded object-cover" /> : null}
                <div className="flex-1"><p className="line-clamp-2 leading-snug">{i.name}</p><p className="text-xs text-muted">{i.colour} · {i.size} · Qty {i.qty}{!i.isExchangeable ? " · Non-exchangeable" : ""}</p></div>
                <p className="font-medium">{inr(i.price * i.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(p?.subtotal ?? props.initialSubtotal)}</dd></div>
            {p?.couponDiscount ? <div className="flex justify-between text-save"><dt>Coupon {quote?.couponCode}</dt><dd>−{inr(p.couponDiscount)}</dd></div> : null}
            {p?.couponError ? <p className="text-xs text-danger">{p.couponError}</p> : null}
            {p?.prepaidDiscount ? <div className="flex justify-between text-save"><dt>Prepaid discount</dt><dd>−{inr(p.prepaidDiscount)}</dd></div> : null}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{p ? (p.shippingFee ? inr(p.shippingFee) : <span className="text-save">Free</span>) : "Enter pincode"}</dd></div>
            {p?.codFee ? <div className="flex justify-between"><dt>COD fee</dt><dd>{inr(p.codFee)}</dd></div> : null}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{inr(p?.total ?? props.initialSubtotal)}</dd></div>
            {p ? <p className="text-right text-[11px] text-muted">Includes GST of {inr(p.taxTotal)}</p> : null}
          </dl>
          {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
          <button onClick={place} disabled={pending || !quoteFresh || !props.loggedIn || !quote?.serviceable || (method === "COD" && needsCodOtp && codOtp.length !== 6 && !!codOtpSent)} className="btn btn-primary mt-4 w-full py-3.5">
            {pending ? "Please wait…" : p && !quoteFresh ? "Updating total…" : !p ? (props.loggedIn ? "Enter delivery pincode" : "Log in to continue") : method === "COD" ? `Place order · ${inr(p.total)}` : `Pay ${inr(p.total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">By placing the order you agree to our Terms and Exchange Policy.</p>
          {props.mockPayments ? <p className="mt-2 bg-gold-soft p-2 text-center text-[11px]">Test mode: payments are simulated (Razorpay keys not added yet).</p> : null}
        </div>
      </aside>

      {mock ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Test payment">
          <div className="w-full max-w-sm bg-white p-5 text-center">
            <p className="eyebrow text-sm">Test payment</p>
            <p className="mt-2 text-sm">Order {mock.orderNumber} · {inr(mock.amount)}</p>
            <p className="mt-1 text-xs text-muted">Razorpay is not connected yet. Choose what should happen:</p>
            <div className="mt-4 flex gap-2">
              <button disabled={pending} onClick={() => mockPay(false)} className="btn btn-outline flex-1">Fail</button>
              <button disabled={pending} onClick={() => mockPay(true)} className="btn btn-primary flex-1">Pay successfully</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
