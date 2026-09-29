import { NextResponse, type NextRequest } from "next/server";

// The ops console lives at an internal route and is only reachable through a secret path
// configured on the server. The internal route itself always answers "not found".
const INTERNAL = "/zdc-internal";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = (process.env.OPS_CONSOLE_PATH ?? "").replace(/^\/+|\/+$/g, "");

  if (pathname === INTERNAL || pathname.startsWith(`${INTERNAL}/`)) {
    return NextResponse.rewrite(new URL("/__missing", req.url));
  }
  if (secret && (pathname === `/${secret}` || pathname.startsWith(`/${secret}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = INTERNAL + pathname.slice(secret.length + 1);
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|dummy/|uploads/).*)"],
};
