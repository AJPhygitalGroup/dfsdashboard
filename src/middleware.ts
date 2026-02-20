import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login (sign-in page)
     * - /api/auth (NextAuth endpoints)
     * - /api/cron (Vercel cron – authenticated via CRON_SECRET)
     * - /api/upload (authenticated via UPLOAD_API_KEY bearer token)
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, /robots.txt, etc.
     */
    "/((?!login|api/auth|api/cron|api/upload|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
