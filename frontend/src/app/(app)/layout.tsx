"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { Masthead } from "@/components/masthead";

/**
 * The signed-in shell. Redirects rather than rendering a half-populated page:
 * every route below this needs a token, and showing the layout before the
 * session is known would flash the whole application at a signed-out visitor.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, ready, configError } = useAuth();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (configError) {
    return (
      <div className="shell">
        <main id="main" className="wrap" style={{ paddingBlock: "var(--s-8)" }}>
          <p className="alert alert--error" role="alert">
            Sign-in is not configured on this deployment yet.
          </p>
        </main>
      </div>
    );
  }

  if (!ready || !user) {
    return (
      <div className="shell">
        <main id="main" className="wrap" style={{ paddingBlock: "var(--s-8)" }}>
          <p className="label">Checking your session…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <Masthead />
      <main id="main" className="wrap" style={{ flex: 1, paddingBottom: "var(--s-8)" }}>
        {children}
      </main>
    </div>
  );
}
