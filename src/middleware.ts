import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin")) {
      if (token?.rol !== "ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("error", "forbidden");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/panel/:path*",
    "/socios/:path*",
    "/planes/:path*",
    "/suscripciones/:path*",
    "/pagos/:path*",
    "/checkin/:path*",
    "/caja/:path*",
    "/reportes/:path*",
  ],
};
