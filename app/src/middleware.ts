import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Routes accessibles sans authentification dans le back-office.
const PUBLIC_PATHS = ["/login", "/api/health", "/api/public"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Résolution du tenant par sous-domaine : <slug>.<PUBLIC_BASE_DOMAIN>
  const host = (req.headers.get("host") ?? "").split(":")[0];
  const base = process.env.PUBLIC_BASE_DOMAIN ?? "gtbuilder.fr";
  let slug = "";
  if (host.endsWith(base)) {
    const sub = host.slice(0, -base.length).replace(/\.$/, "");
    slug = sub === "app" ? "" : sub; // app.<domaine> = back-office sans tenant figé
  }

  const res = NextResponse.next();
  if (slug) res.headers.set("x-tenant-slug", slug);

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return res;

  // 2) Garde JWT
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const reject = () => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  };

  if (!token) return reject();

  try {
    const claims = await verifySession(token);
    res.headers.set("x-user-id", claims.sub);
    res.headers.set("x-tenant-id", claims.tid);
    res.headers.set("x-user-role", claims.role);
    return res;
  } catch {
    return reject();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
