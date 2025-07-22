"use client";

import { usePathname } from "next/navigation";
import {ThemeSwitcher} from "@/components/theme-switcher";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isUserPath = pathname.startsWith("/user");

  return (
    <>
      {!isUserPath && <ThemeSwitcher />}
      <main>{children}</main>
    </>
  );
}
