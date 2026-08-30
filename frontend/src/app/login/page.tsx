"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { DEMO_CASE, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

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
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google sign-in window was closed before it finished.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups for this site.";
    case "auth/account-exists-with-different-credential":
      return "An account with that email already exists. Sign in with your password instead.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this project yet.";
    case "auth/unauthorized-domain":
      return "This domain is not on the Firebase authorised list for sign-in.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

/** Google's mark, inline. Rendering it from a script or a CDN image would be a
 *  third-party request on the sign-in page, and both are blocked in some of the
 *  networks this will be demonstrated on. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, configError, signIn, register, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** True once the demo credentials have been written into the form, so the
   *  button can say which step it is on. */
  const [filled, setFilled] = useState(false);

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
            <div className="stack">
              {error ? (
                <p className="alert alert--error" role="alert">
                  {error}
                </p>
              ) : null}




              <form className="stack" onSubmit={submit} noValidate>
                <label className={`field ${filled ? "field--filled" : ""}`}>
                  <span className="label">Email</span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>

                <label className={`field ${filled ? "field--filled" : ""}`}>
                  <span className="label">Password</span>
                  <input
                    id="password"
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

              <div
                className="row"
                style={{ gap: "var(--s-3)", flexWrap: "nowrap" }}
                aria-hidden="true"
              >
                <hr className="divider" style={{ flex: 1 }} />
                <span className="label">or</span>
                <hr className="divider" style={{ flex: 1 }} />
              </div>

              <button
                type="button"
                className="btn btn--quiet"
                disabled={busy}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    await signInWithGoogle();
                    router.replace("/dashboard");
                  } catch (caught) {
                    setError(readableAuthError(caught));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <GoogleMark />
                Continue with Google
              </button>

              {/* A pre-seeded account holding published case PUB-01, so anyone
                  reviewing this can see every screen populated with real,
                  checkable data without creating an account or typing in a
                  month of expenses first. */}
              <div className={`demo-card ${filled ? "is-collapsing" : ""}`}>
                <div className="row-between" style={{ gap: "var(--s-2)" }}>
                  <p className="label" style={{ margin: 0 }}>
                    Reviewer? Use the demo account
                  </p>
                  <span className="chip chip--ok">case {DEMO_CASE} loaded</span>
                </div>

                <dl className="demo-creds">
                  <div>
                    <dt className="label">Email</dt>
                    <dd className="mono">{DEMO_EMAIL}</dd>
                  </div>
                  <div>
                    <dt className="label">Password</dt>
                    <dd className="mono">{DEMO_PASSWORD}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);

                    // Fill the visible fields first and give the eye a beat to
                    // register it. Signing in from a button while the form sits
                    // empty looks like a different, hidden mechanism; showing
                    // the credentials land makes it obvious that this is an
                    // ordinary sign-in anyone could type themselves.
                    setEmail(DEMO_EMAIL);
                    setPassword(DEMO_PASSWORD);
                    setFilled(true);
                    await new Promise((resolve) => setTimeout(resolve, 450));

                    try {
                      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
                      router.replace("/dashboard");
                    } catch (caught) {
                      setError(readableAuthError(caught));
                      setFilled(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? (filled ? "Signing in…" : "Filling in…") : "Try the demo"}
                </button>

                <p className="faint" style={{ fontSize: "var(--t-xs)", margin: 0 }}>
                  Shared and editable by anyone. Every figure it shows is computed from the
                  published dataset, so it can be checked against the official case by hand.
                </p>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
