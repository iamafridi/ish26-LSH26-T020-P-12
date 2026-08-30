"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAuth } from "../hooks/use-auth";

export function RegisterForm() {
  const router = useRouter();
  const { register, configurationError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register(email.trim(), password);
      router.replace("/dashboard");
    } catch (registerError) {
      const message = registerError instanceof Error ? registerError.message : "";
      setError(message.includes("email-already-in-use")
        ? "An account already exists for this email."
        : "Unable to create the account. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></label>
      <label>Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={6} required /></label>
      {(error ?? configurationError) && <p className="form-error" role="alert">{error ?? configurationError}</p>}
      <button type="submit" disabled={submitting || Boolean(configurationError)}>{submitting ? "Creating account…" : "Create account"}</button>
    </form>
  );
}
