import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const userCookie = req.cookies.get("user")?.value;
  const userRoleCookie = req.cookies.get("user_role")?.value;

  // Protected routes
  const isUserRoute = pathname.startsWith("/user");
  const isAdminRoute = pathname.startsWith("/admin");

  // If not authenticated and trying to access protected routes, redirect to signin
  if (!userCookie || !userRoleCookie) {
    if (isUserRoute || isAdminRoute) {
      const url = req.nextUrl.clone();
      url.pathname = "/signin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Role-based access control using the user_role cookie
  const role = userRoleCookie.toUpperCase();

  // Admin route: must have ADMIN role
  if (isAdminRoute && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/user/dashboard";
    return NextResponse.redirect(url);
  }

  // User route: must have EMPLOYEE role
  if (isUserRoute && role !== "EMPLOYEE") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  // Dashboard view preference logic
  const ua = req.headers.get("user-agent") || "";
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua);
  const isOnMobile = pathname.startsWith("/user/dashboard/mobile");
  const isOnDesktop = pathname === "/user/dashboard";
  const viewPref = req.cookies.get("dashboard-view")?.value;

  if (viewPref === "mobile" && isOnMobile) return NextResponse.next();
  if (viewPref === "desktop" && isOnDesktop) return NextResponse.next();

  if (isOnMobile) {
    const response = NextResponse.next();
    response.cookies.set("dashboard-view", "mobile", { path: "/" });
    return response;
  }

  if (isOnDesktop) {
    if (!viewPref && isMobile) {
      const url = req.nextUrl.clone();
      url.pathname = "/user/dashboard/mobile";
      const response = NextResponse.redirect(url);
      response.cookies.set("dashboard-view", "mobile", { path: "/" });
      return response;
    }

    const response = NextResponse.next();
    response.cookies.set("dashboard-view", "desktop", { path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/admin/:path*"],
};
