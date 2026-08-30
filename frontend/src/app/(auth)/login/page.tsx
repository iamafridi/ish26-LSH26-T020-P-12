import Link from "next/link";

import { LoginForm } from "@/modules/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="back-link">← Back</Link>
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to your ledger</h1>
        <p>Your financial records stay connected to your private account.</p>
        <LoginForm />
      </section>
    </main>
  );
}
