import Link from "next/link";

import { RegisterForm } from "@/modules/auth/components/register-form";

export default function RegisterPage() {
  return <main className="auth-page"><section className="auth-card"><Link href="/login" className="back-link">← Sign in</Link><p className="eyebrow">CREATE ACCOUNT</p><h1>Start your ledger</h1><p>Your salary, expenses, and savings goals remain connected to your private account.</p><RegisterForm /></section></main>;
}
