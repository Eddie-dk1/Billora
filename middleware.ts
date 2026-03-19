import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_PATH = "/auth/sign-in";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding")
  );
}

function withCallback(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname) && pathname !== AUTH_PATH) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = Boolean(token?.uid);

  if (!isAuthenticated && isProtectedPath(pathname)) {
    const url = new URL(AUTH_PATH, request.url);
    url.searchParams.set("callbackUrl", withCallback(pathname, search));
    url.searchParams.set("reason", "session_required");
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && pathname === AUTH_PATH) {
    const callback = request.nextUrl.searchParams.get("callbackUrl");
    const safeCallback = callback && callback.startsWith("/") ? callback : "/";
    return NextResponse.redirect(new URL(safeCallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/sign-in", "/payments/:path*", "/calendar/:path*", "/analytics/:path*", "/reminders/:path*", "/settings/:path*", "/onboarding"],
};
