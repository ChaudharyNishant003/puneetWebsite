import type { Metadata } from "next";
import { shop } from "@/lib/config";
import { IconPhone, IconPin, IconStore, IconSwap } from "@/components/icons";

export const metadata: Metadata = { title: "Visit Our Store", description: `${shop.name} store at ${shop.address}. ${shop.hours}. Try, alter and exchange in person.` };

export default function StorePage() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: shop.name,
    address: { "@type": "PostalAddress", streetAddress: shop.address, addressLocality: shop.city, addressRegion: shop.state, postalCode: shop.pincode, addressCountry: "IN" },
    telephone: shop.phone,
    openingHours: "Mo-Su 10:00-21:00",
    url: `${shop.siteUrl}/store`,
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <h1 className="eyebrow text-center text-lg">Visit Our Store</h1>
      <p className="mt-2 text-center text-sm text-muted">Real shop, real people, since {shop.since}.</p>
      <div className="mt-6 rounded bg-brand-soft p-5">
        <p className="flex items-start gap-2 text-sm"><IconPin className="mt-0.5 shrink-0" /> <span><b>{shop.name}</b><br />{shop.address}, {shop.state} {shop.pincode}</span></p>
        <p className="mt-3 text-sm">🕙 {shop.hours}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={shop.mapsUrl} target="_blank" rel="noopener" className="btn btn-primary"><IconPin size={16} /> Get directions</a>
          <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="btn btn-outline"><IconPhone size={16} /> Call {shop.phone}</a>
        </div>
      </div>
      <h2 className="eyebrow mt-8 text-sm">What you can do at the store</h2>
      <ul className="mt-3 space-y-3 text-sm">
        <li className="flex gap-3"><IconStore className="shrink-0" /> See and try every piece you find online. Online and store prices are the same.</li>
        <li className="flex gap-3"><IconSwap className="shrink-0" /> Exchange the size of an online order at the counter. Bring your order number.</li>
        <li className="flex gap-3"><span className="w-5 shrink-0 text-center">✂️</span> Get simple alterations done by our tailor (ask at the store for charges and timing).</li>
      </ul>
      <p className="mt-6 text-xs text-muted">Store pickup and reserve-and-try are coming soon.</p>
    </div>
  );
}
