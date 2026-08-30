"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/receipts", label: "Receipts" },
  { href: "/pockets", label: "Pockets" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

/**
 * Navigation. Identity and sign-out live in the account bar below, so this row
 * has one job.
 *
 * Six destinations do not fit across a 390px screen, and a horizontally
 * scrolling strip hides half of them behind a gesture with no affordance. On
 * small screens the same links become a drawer instead: one control, all six
 * destinations visible at once, each a full-width target.
 */
export function Masthead() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation. Without this the drawer stays open over the page you
  // just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link className="wordmark" href="/dashboard">
          Ledger
        </Link>

        {/* The wide-screen nav. Hidden on small screens in favour of the drawer. */}
        <nav className="nav nav--wide" aria-label="Sections">
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

        <button
          type="button"
          className="drawer-toggle"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close the menu" : "Open the menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={`burger ${open ? "is-open" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="drawer-toggle-text">{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      {/* Rendered rather than unmounted so the panel can transition out. */}
      <div
        className={`drawer-scrim ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <nav
        id="mobile-nav"
        className={`drawer ${open ? "is-open" : ""}`}
        aria-label="Sections"
        // While closed the panel is off-screen but still in the document, so its
        // links would otherwise stay in the tab order and be reachable by a
        // keyboard user who cannot see them. `inert` takes the whole subtree out.
        inert={!open}
      >
        <p className="label drawer-heading">Go to</p>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="drawer-link"
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
            <span className="drawer-chevron" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
