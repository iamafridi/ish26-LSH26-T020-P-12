import Link from "next/link";

import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";

export default function ForgotPasswordPage() {
  return <main className="auth-page"><section className="auth-card"><Link href="/login" className="back-link">← Sign in</Link><p className="eyebrow">RESET PASSWORD</p><h1>Recover access</h1><p>Firebase will send password-reset instructions to your email.</p><ResetPasswordForm /></section></main>;
}
