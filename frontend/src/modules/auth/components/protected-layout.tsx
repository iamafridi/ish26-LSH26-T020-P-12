"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "../hooks/use-auth";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/savings-pockets", label: "Savings pockets" },
];

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut, configurationError } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return <main className="centered-state">Loading your ledger…</main>;
  }

  if (configurationError) {
    return <main className="centered-state">{configurationError}</main>;
  }

  if (!user) {
    return <main className="centered-state">Redirecting to sign in…</main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          Ledger
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span>{user.email ?? "Signed-in user"}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
