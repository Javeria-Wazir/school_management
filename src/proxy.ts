import { NextResponse, type NextRequest } from "next/server";
import { devAutoLoginEmail, SESSION_COOKIE } from "@/server/auth/config";

/**
 * Optimistic check only: no session cookie → go to sign-in. Whether the session is valid, and what
 * the user may do, is decided on the server for every page and action (see src/server/auth/current.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE) || devAutoLoginEmail() !== null;
  if (!hasSession && pathname !== "/login") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
