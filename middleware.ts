import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua);

  if (isMobile && req.nextUrl.pathname === "/user/dashboard") {
    const url = req.nextUrl.clone();
    url.pathname = "/user/dashboard/mobile";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/dashboard"], // only apply to desktop dashboard route
};
