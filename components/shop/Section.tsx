import Link from "next/link";

export function Section({ title, subtitle, href, children }: { title: string; subtitle?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8">
      <div className="mb-4 text-center">
        <h2 className="eyebrow text-[15px] md:text-lg">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted md:text-sm">{subtitle}</p> : null}
      </div>
      {children}
      {href ? (
        <div className="mt-4 text-center">
          <Link href={href} className="text-xs font-semibold uppercase tracking-wider underline underline-offset-4">View all</Link>
        </div>
      ) : null}
    </section>
  );
}
