"use client";

import { useState, type FormEvent } from "react";

import { useAuth } from "../hooks/use-auth";

export function ResetPasswordForm() {
  const { resetPassword, configurationError } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      setError("Unable to send the reset email. Check the address and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) return <p className="success-message" role="status">If an account exists for that email, a password-reset message has been sent.</p>;
  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      {(error ?? configurationError) && <p className="form-error" role="alert">{error ?? configurationError}</p>}
      <button type="submit" disabled={submitting || Boolean(configurationError)}>{submitting ? "Sending…" : "Send reset email"}</button>
    </form>
  );
}
