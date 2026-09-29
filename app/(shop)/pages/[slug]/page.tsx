import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPages } from "@/lib/pages";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPages(await getSettings())[(await params).slug];
  return p ? { title: p.title, alternates: { canonical: `/pages/${(await params).slug}` } } : {};
}

export default async function ContentPage({ params }: Props) {
  const p = getPages(await getSettings())[(await params).slug];
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="eyebrow mb-6 text-center text-lg">{p.title}</h1>
      <div className="space-y-4 text-[14.5px] leading-relaxed">
        {p.body.map((para, i) => (<p key={i} className={para.startsWith("[Placeholder") ? "rounded bg-gold-soft p-3 text-sm text-muted" : ""}>{para}</p>))}
      </div>
    </article>
  );
}
