import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isAuthenticated = !!session;

  const pathname = nextUrl.pathname;

  // Always allow: auth API, login page, static assets, proxy endpoints (Bearer auth), and OAuth AS endpoints
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/mcp/proxy") ||
    pathname.startsWith("/api/mcp/namespaces") ||
    pathname.startsWith("/api/oauth") ||
    pathname.startsWith("/oauth/callback") ||
    pathname.startsWith("/oauth/error") ||
    pathname.startsWith("/.well-known") ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  // Return 401 JSON for unauthenticated API requests
  if (!isAuthenticated && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block non-admin from /admin routes
  if (pathname.startsWith("/admin") && !session.user.isAdmin) {
    return NextResponse.redirect(new URL("/chat", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon\\.svg).*)",
  ],
};
