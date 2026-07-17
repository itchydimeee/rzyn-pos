import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "rzyn-pos-secret-change-in-production"
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("rzyn-pos-token")?.value;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const headers = new Headers(req.headers);
      headers.set("x-user-id", payload.userId as string);
      headers.set("x-user-role", payload.role as string);
      headers.set("x-stock-permission", String(payload.stockPermission));
      return NextResponse.next({ request: { headers } });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname === "/") {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;
        return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/cashier", req.url));
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/cashier")) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store, max-age=0");
    if (!token) return NextResponse.redirect(new URL("/", req.url));
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (pathname.startsWith("/admin") && payload.role !== "admin") {
        res.headers.delete("Cache-Control");
        return NextResponse.redirect(new URL("/cashier", req.url));
      }
      if (pathname.startsWith("/cashier") && payload.role === "admin") {
        res.headers.delete("Cache-Control");
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return res;
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
