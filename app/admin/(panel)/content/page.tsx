import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getCms } from "@/lib/settings";
import { BUILTIN_SYNONYMS } from "@/lib/search/parse";
import { deleteSynonymAction, saveAnnouncementAction, saveHeroAction, saveRailsAction, saveSynonymAction } from "@/app/actions/admin-config";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Homepage & Search" };

type Hero = { title: string; subtitle: string; cta: string; href: string; from: string; to: string; image?: string };
type Rail = { title: string; subtitle?: string; source: string };

const SOURCES = [["storeBestseller", "Store bestsellers (ticked products)"], ["new", "Newest products"], ["featured", "Featured products"], ["bestselling", "Top selling online"]];

export default async function Content() {
  await requireAdmin();
  const [ann, hero, rails, syns] = await Promise.all([
    getCms<{ text: string; link?: string }>("announcement", { text: "" }),
    getCms<Hero>("hero", { title: "", subtitle: "", cta: "Shop Now", href: "/c/new-arrivals", from: "#C9727A", to: "#8E1B3A" }),
    getCms<Rail[]>("rails", []),
    db.searchSynonym.findMany({ orderBy: { term: "asc" } }),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Homepage & Search</h1>

      <section className="border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Top announcement bar</h2>
        <ActionForm action={saveAnnouncementAction}>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <div><label className="label" htmlFor="ann-text">Text</label><input id="ann-text" name="text" defaultValue={ann.text} maxLength={140} className="input" /></div>
            <div><label className="label" htmlFor="ann-link">Link (optional, e.g. /c/sale)</label><input id="ann-link" name="link" defaultValue={ann.link} className="input" /></div>
          </div>
        </ActionForm>
      </section>

      <section className="border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Main banner (one campaign at a time)</h2>
        <ActionForm action={saveHeroAction}>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label" htmlFor="h-title">Headline</label><input id="h-title" name="title" defaultValue={hero.title} maxLength={60} className="input" /></div>
            <div><label className="label" htmlFor="h-sub">Sub-line</label><input id="h-sub" name="subtitle" defaultValue={hero.subtitle} maxLength={120} className="input" /></div>
            <div><label className="label" htmlFor="h-cta">Button text</label><input id="h-cta" name="cta" defaultValue={hero.cta} maxLength={24} className="input" /></div>
            <div><label className="label" htmlFor="h-href">Button link (e.g. /c/occasion-festive)</label><input id="h-href" name="href" defaultValue={hero.href} className="input" /></div>
            <div className="flex items-end gap-3"><label className="text-sm">Colours <input type="color" name="from" defaultValue={hero.from} className="ml-1 h-8 w-10 align-middle" /><input type="color" name="to" defaultValue={hero.to} className="ml-1 h-8 w-10 align-middle" /></label></div>
            <div><label className="label" htmlFor="h-img">Banner photo (optional, landscape)</label><input id="h-img" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-xs" />{hero.image ? <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" name="removeImage" /> Remove current photo</label> : null}</div>
          </div>
        </ActionForm>
      </section>

      <section className="border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Product rails on the homepage</h2>
        <ActionForm action={saveRailsAction}>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-2 md:grid-cols-3">
                <input name={`title_${i}`} defaultValue={rails[i]?.title} placeholder={`Rail ${i + 1} title (leave empty to hide)`} aria-label={`Rail ${i + 1} title`} className="input" />
                <input name={`subtitle_${i}`} defaultValue={rails[i]?.subtitle} placeholder="Sub-line" aria-label={`Rail ${i + 1} sub-line`} className="input" />
                <select name={`source_${i}`} defaultValue={rails[i]?.source ?? "new"} aria-label={`Rail ${i + 1} products`} className="input">{SOURCES.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}</select>
              </div>
            ))}
          </div>
        </ActionForm>
      </section>

      <section className="border border-line bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Search words (Hinglish dictionary)</h2>
        <p className="mb-3 text-xs text-muted">Teach search the words your customers use. Built in already: {Object.keys(BUILTIN_SYNONYMS).slice(0, 18).join(", ")}…</p>
        <ul className="mb-3 flex flex-wrap gap-2 text-xs">
          {syns.map((s) => (<li key={s.id} className="flex items-center gap-1 bg-surface px-2 py-1"><b>{s.term}</b> → {s.expandsTo.join(", ")} <ActionButton action={deleteSynonymAction.bind(null, s.term)} className="ml-1 text-danger">×</ActionButton></li>))}
        </ul>
        <ActionForm action={saveSynonymAction} submit="Add word" reset>
          <div className="grid gap-2 md:grid-cols-2">
            <input name="term" placeholder="Customer word, e.g. lehnga" aria-label="Customer word" className="input" />
            <input name="expandsTo" placeholder="Also search for, e.g. lehenga, lehenga choli" aria-label="Also search for" className="input" />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
