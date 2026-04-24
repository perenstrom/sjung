import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const authPages = new Set(["/auth/login", "/auth/signup"]);

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isAuthenticated = Boolean(token?.sub);
  const isProtectedRoute = nextUrl.pathname.startsWith("/app");
  const isAuthPage = authPages.has(nextUrl.pathname);

  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL("/auth/login", nextUrl.origin);
    const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/app", nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/auth/login", "/auth/signup"],
};
