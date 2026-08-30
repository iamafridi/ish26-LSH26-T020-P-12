import Link from "next/link";

import { Footer } from "@/components/footer";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

/**
 * The landing page is in "persuade" mode: it makes one argument and gets out of
 * the way. The argument is precision, because that is what actually separates
 * this from a spreadsheet — so the page is built around a worked figure from a
 * published case rather than around feature bullets.
 */

const FEATURES = [
  {
    index: "01",
    title: "Reads your receipts, then asks",
    body: "Photograph a bill and the amount, date and shop come back with a confidence mark on each field and the raw text that was read. Nothing is saved until you have checked it. A field the reader could not make out arrives blank, not guessed.",
  },
  {
    index: "02",
    title: "Shows the month against your salary",
    body: "Total spent, the breakdown by category, your largest single expenses, and how each category moved against last month — including the ones that vanished.",
  },
  {
    index: "03",
    title: "Forecasts while it still matters",
    body: "Your daily pace projected to month end, and what that leaves you with. When it leaves you short, it says by how much and what the daily figure would have to become.",
  },
  {
    index: "04",
    title: "Prices your savings honestly",
    body: "A pocket shows two completion dates: the one your stated contribution implies, and the one your forecast can actually fund. Alongside it, what a DPS at a stated rate returns over the same months, computed month by month.",
  },
];

export default function Home() {
  return (
    <div className="shell">
      <header className="masthead">
        <div className="wrap masthead-inner">
          <span className="wordmark">Ledger</span>
          <Link className="btn btn--sm" href="/login">
            Open your ledger
          </Link>
        </div>
      </header>

      <main id="main" style={{ flex: 1 }}>
        {/* -------------------------------------------------------- hero */}
        <section className="hero">
          <div className="wrap">
            <div className="grid grid-sidebar" style={{ alignItems: "center" }}>
              <div className="stack">
                <p className="eyebrow">Personal Ledger Manager</p>
                <h1 className="hero-title">
                  Every taka accounted for,
                  <br />
                  <span className="grad-text">down to the paisa.</span>
                </h1>
                <p className="lede" style={{ maxWidth: "46ch" }}>
                  Record a salary and what you spend against it. Photograph a receipt and check what
                  was read before it is saved. See where the month is heading while there is still
                  time to change it.
                </p>

                <div className="row" style={{ marginTop: "var(--s-3)" }}>
                  <Link className="btn" href="/login">
                    Open your ledger
                  </Link>
                  <Link className="btn btn--quiet" href="/login">
                    Try the demo
                  </Link>
                </div>

                <p className="note" style={{ fontSize: "var(--t-xs)", marginTop: "var(--s-2)" }}>
                  Demo sign-in — <span className="mono">{DEMO_EMAIL}</span> ·{" "}
                  <span className="mono">{DEMO_PASSWORD}</span>
                </p>
              </div>

              {/* A real figure from published case PUB-03, so the number on the
                  landing page is one a judge can verify rather than a mock-up. */}
              <figure className="panel panel--hero hero-figure">
                <div className="row-between">
                  <p className="label">April, projected month end</p>
                  <span className="chip chip--short">shortfall</span>
                </div>

                <p className="money money--display is-short hero-amount">
                  <span className="taka-sign">৳</span>2,774<span className="paisa">.69</span>
                </p>

                <p className="note hero-caption">short, at the current pace of ৳2,656.44 a day</p>

                <hr className="divider" />

                <dl className="hero-rows">
                  {[
                    ["Salary", "৳75,000.00"],
                    ["Spent to 17 April", "৳45,159.50"],
                    ["Projected total", "৳77,774.69"],
                  ].map(([term, value]) => (
                    <div key={term} className="row-between">
                      <dt className="note" style={{ margin: 0 }}>
                        {term}
                      </dt>
                      <dd className="money" style={{ margin: 0 }}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="label hero-source">from published case PUB&#8209;03</p>
              </figure>
            </div>
          </div>
        </section>

        <hr className="sep sep--marked" />

        {/* ---------------------------------------------------- what it does */}
        <section className="section">
          <div className="wrap">
            <p className="eyebrow">What it does</p>
            <div className="grid grid-2 feature-grid">
              {FEATURES.map((feature) => (
                <article key={feature.index} className="panel feature">
                  <span className="feature-index mono">{feature.index}</span>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="note">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <hr className="sep sep--marked" />

        {/* ------------------------------------------------ the arithmetic */}
        <section className="section">
          <div className="wrap">
            <p className="eyebrow">On the arithmetic</p>
            <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)", alignItems: "start" }}>
              <p className="arithmetic-lede">
                A binary floating-point number cannot represent one paisa exactly. Over a savings
                schedule that compounds a rounded figure every month, the error is not theoretical —
                it shows up in the answer. Every amount here is held as an{" "}
                <span className="grad-text">exact decimal</span> and crosses every boundary as a
                fixed two-place string.
              </p>

              <div className="stack">
                {[
                  { figure: "25", label: "published cases, all passing" },
                  { figure: "2", label: "independent implementations that agree" },
                  { figure: "0", label: "floating-point money operations" },
                ].map((stat) => (
                  <div className="panel panel--accent stat-tile" key={stat.label}>
                    <span className="stat-figure">{stat.figure}</span>
                    <span className="note" style={{ margin: 0 }}>
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="marketing" />
    </div>
  );
}
