"use client";

import { usePathname } from "next/navigation";
import {ThemeSwitcher} from "@/components/theme-switcher";
import { PublicFooter, PublicHeader } from "@/components/public-shell";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isUserPath = pathname.startsWith("/user") || pathname.startsWith("/admin");
  const hidePublicChrome = isUserPath || pathname === "/logout" || pathname === "/session-expired";

  return (
    <>
      {!hidePublicChrome && <ThemeSwitcher />}
      {!hidePublicChrome && <PublicHeader />}
      <main>{children}</main>
      {!hidePublicChrome && <PublicFooter />}
    </>
  );
}
