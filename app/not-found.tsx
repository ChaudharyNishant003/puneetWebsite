import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="eyebrow text-sm text-muted">404</p>
      <h1 className="mt-2 text-xl font-semibold">This page isn't here</h1>
      <p className="mt-2 text-sm text-muted">The product may have sold out or the link may be old.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn btn-dark">Go home</Link>
        <Link href="/c/new-arrivals" className="btn btn-outline">New arrivals</Link>
      </div>
    </div>
  );
}
