import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero-panel">
        <p className="eyebrow">PERSONAL LEDGER MANAGER</p>
        <h1>See where your salary goes and where your savings can take you.</h1>
        <p className="hero-copy">
          Record expenses, review receipt details, forecast your month-end balance, and plan
          savings pockets from one private ledger.
        </p>
        <Link className="primary-link" href="/login">
          Open your ledger
        </Link>
      </section>
      <section className="feature-grid" aria-label="Application features">
        <article><strong>Track</strong><span>Salary and daily expenses</span></article>
        <article><strong>Understand</strong><span>Categories and monthly changes</span></article>
        <article><strong>Plan</strong><span>Forecasts and savings pockets</span></article>
      </section>
    </main>
  );
}
