"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";

/** Firebase error codes are not sentences. Turn the ones users actually hit into
 *  something that says what to do next. */
function readableAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password do not match an account.";
    case "auth/email-already-in-use":
      return "An account already exists for that email. Sign in instead.";
    case "auth/weak-password":
      return "Use a password of at least six characters.";
    case "auth/invalid-email":
      return "That does not look like an email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Could not reach the sign-in service. Check your connection.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, configError, signIn, register } = useAuth();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await register(email, password);
      router.replace("/dashboard");
    } catch (caught) {
      setError(readableAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="masthead">
        <div className="wrap masthead-inner">
          <Link className="wordmark" href="/">
            Ledger
          </Link>
        </div>
      </header>

      <main id="main" className="wrap" style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "26rem", paddingBlock: "var(--s-8)" }}>
          <p className="eyebrow">{mode === "signin" ? "Sign in" : "Create an account"}</p>
          <h1 style={{ marginBlock: "var(--s-4) var(--s-5)" }}>
            {mode === "signin" ? "Open your ledger." : "Start your ledger."}
          </h1>

          {configError ? (
            <p className="alert alert--error" role="alert">
              Sign-in is not configured on this deployment yet.
            </p>
          ) : (
            <form className="stack" onSubmit={submit} noValidate>
              {error ? (
                <p className="alert alert--error" role="alert">
                  {error}
                </p>
              ) : null}

              <label className="field">
                <span className="label">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="field">
                <span className="label">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>

              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => {
                  setMode(mode === "signin" ? "register" : "signin");
                  setError(null);
                }}
              >
                {mode === "signin" ? "Create an account instead" : "I already have an account"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
