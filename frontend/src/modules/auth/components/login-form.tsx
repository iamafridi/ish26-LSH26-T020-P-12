"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAuth } from "../hooks/use-auth";

function readableAuthError(error: unknown): string {
  if (error instanceof Error && error.message.includes("auth/invalid-credential")) {
    return "The email or password is incorrect.";
  }
  return "Unable to sign in. Check your details and try again.";
}

export function LoginForm() {
  const router = useRouter();
  const { signIn, configurationError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/dashboard");
    } catch (signInError) {
      setError(readableAuthError(signInError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          minLength={6}
          required
        />
      </label>
      {(error ?? configurationError) && (
        <p className="form-error" role="alert">
          {error ?? configurationError}
        </p>
      )}
      <button type="submit" disabled={submitting || Boolean(configurationError)}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
