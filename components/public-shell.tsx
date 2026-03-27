"use client";

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
            <span className={styles.logoMark}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 2v15M4 7l8 5 8-5" stroke="white" strokeWidth="2" />
              </svg>
            </span>
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
              <span className={styles.footerLogo}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M12 2v15M4 7l8 5 8-5" stroke="white" strokeWidth="2" />
                </svg>
              </span>
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
