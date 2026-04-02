"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import styles from "./public-shell.module.css";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact-sales", label: "Contact" },
  { href: "/signin", label: "Sign In" },
];

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <Link href="/" className={styles.brand} aria-label="Go to home">
            <Image
              src="/App-logo.png"
              alt="Avinya HRMS logo"
              width={36}
              height={36}
              className={styles.logoMark}
              priority
            />
            <span className={styles.brandText}>Avinya HRMS</span>
          </Link>

          <div className={styles.right}>
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${isLinkActive(pathname, item.href) ? styles.linkActive : ""}`}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/start-trial" className={styles.cta}>
              Start Trial <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.mobileHeaderActions}>
            <Link
              href="/signin"
              className={`${styles.mobileSignIn} ${
                isLinkActive(pathname, "/signin") ? styles.mobileSignInActive : ""
              }`}
            >
              Sign In
            </Link>
            <button
              type="button"
              className={styles.menuButton}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav} aria-label="Mobile navigation">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileLink} ${
                    isLinkActive(pathname, item.href) ? styles.mobileLinkActive : ""
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className={styles.mobileActions}>
              <Link href="/start-trial" className={styles.mobileCta}>
                Start Trial <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.footerRow}>
          <div className={styles.footerLeft}>
            <Link href="/" className={styles.brand} aria-label="Go to home">
              <Image
                src="/App-logo.png"
                alt="Avinya HRMS logo"
                width={24}
                height={24}
                className={styles.footerLogo}
              />
            </Link>
            <span>© 2026 Avinya HRMS. All rights reserved.</span>
          </div>

          <div className={styles.footerLinks}>
            <Link href="/pricing" className={styles.footerLink}>Pricing</Link>
            <Link href="/contact-sales" className={styles.footerLink}>Contact</Link>
            <Link href="/signin" className={styles.footerLink}>Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
