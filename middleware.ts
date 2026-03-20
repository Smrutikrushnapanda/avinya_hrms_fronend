import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const userCookie = req.cookies.get("user")?.value;
  const userRoleCookie = req.cookies.get("user_role")?.value;
  const isSigninRoute = pathname === "/signin";

  // Protected routes
  const isUserRoute = pathname.startsWith("/user");
  const isAdminRoute = pathname.startsWith("/admin");

  // If already authenticated and visiting signin, redirect to the appropriate dashboard.
  if (isSigninRoute && userCookie && userRoleCookie) {
    const role = userRoleCookie.toUpperCase();
    const isAdminSideRole = role === "ADMIN" || role === "HR";
    const isEmployeeRole = role === "EMPLOYEE";

    if (isAdminSideRole || isEmployeeRole) {
      const ua = req.headers.get("user-agent") || "";
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop|Mobile/i.test(
          ua
        );
      const url = req.nextUrl.clone();
      url.pathname = isAdminSideRole
        ? "/admin/dashboard"
        : isMobile
          ? "/user/dashboard/mobile"
          : "/user/dashboard";
      const response = NextResponse.redirect(url);
      if (isEmployeeRole) {
        response.cookies.set("dashboard-view", isMobile ? "mobile" : "desktop", {
          path: "/",
        });
      }
      return response;
    }
  }

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
  const isAdminSideRole = role === "ADMIN" || role === "HR";

  // Admin route: must have ADMIN role
  if (isAdminRoute && !isAdminSideRole) {
    const url = req.nextUrl.clone();
    url.pathname = "/user/dashboard";
    return NextResponse.redirect(url);
  }

  // User route: must have EMPLOYEE role
  if (isUserRoute && isAdminSideRole) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  // Dashboard view preference logic — always use UA for mobile detection
  const ua = req.headers.get("user-agent") || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop|Mobile/i.test(ua);
  const isOnMobile = pathname.startsWith("/user/dashboard/mobile");
  const isOnDesktop = pathname === "/user/dashboard";

  if (isOnMobile) {
    const response = NextResponse.next();
    response.cookies.set("dashboard-view", "mobile", { path: "/" });
    return response;
  }

  if (isOnDesktop) {
    if (isMobile) {
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
  matcher: ["/signin", "/user/:path*", "/admin/:path*"],
};
