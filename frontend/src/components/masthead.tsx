"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "./auth-provider";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/receipts", label: "Receipts" },
  { href: "/pockets", label: "Pockets" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

export function Masthead() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link className="wordmark" href="/dashboard">
          Ledger
        </Link>

        <nav className="nav" aria-label="Sections">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="row" style={{ gap: "var(--s-3)" }}>
          {user?.email ? (
            <span className="label" style={{ display: "none" }} data-email>
              {user.email}
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
