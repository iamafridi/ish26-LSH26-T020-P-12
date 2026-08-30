import Link from "next/link";

/**
 * The landing page is in "persuade" mode: it makes one argument and gets out of
 * the way. The argument is precision, because that is what actually separates
 * this from a spreadsheet, so the page is built around a worked figure rather
 * than around feature bullets.
 */
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

      <main id="main" className="wrap" style={{ flex: 1 }}>
        <section className="section" style={{ paddingBlock: "var(--s-9) var(--s-8)" }}>
          <div className="grid grid-sidebar" style={{ alignItems: "end" }}>
            <div className="stack">
              <p className="eyebrow">Personal Ledger Manager</p>
              <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 4.25rem)" }}>
                Every taka accounted for,
                <br />
                down to the paisa.
              </h1>
              <p className="lede" style={{ maxWidth: "44ch" }}>
                Record a salary and what you spend against it. Photograph a receipt and check what
                was read before it is saved. See where the month is heading while there is still
                time to change it.
              </p>
              <div className="row" style={{ marginTop: "var(--s-3)" }}>
                <Link className="btn" href="/login">
                  Open your ledger
                </Link>
              </div>
            </div>

            <figure className="panel" style={{ margin: 0 }}>
              <p className="label">April, projected month end</p>
              <p className="money money--display is-short" style={{ marginBlock: "var(--s-3)" }}>
                <span className="taka-sign">৳</span>2,774<span className="paisa">.69</span>
              </p>
              <p className="note" style={{ marginBottom: "var(--s-4)" }}>
                short, at the current pace of ৳2,656.44 a day
              </p>
              <hr className="divider" />
              <dl className="stack" style={{ gap: "var(--s-2)", marginTop: "var(--s-4)" }}>
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
            </figure>
          </div>
        </section>

        <section className="section">
          <p className="eyebrow">01 &nbsp; What it does</p>
          <div className="grid grid-2" style={{ marginTop: "var(--s-5)" }}>
            {[
              {
                title: "Reads your receipts, then asks",
                body: "Photograph a bill and the amount, date and shop come back with a confidence mark on each field and the raw text that was read. Nothing is saved until you have checked it. A field the reader could not make out arrives blank, not guessed.",
              },
              {
                title: "Shows the month against your salary",
                body: "Total spent, the breakdown by category, your largest single expenses, and how each category moved against last month — including the ones that vanished.",
              },
              {
                title: "Forecasts while it still matters",
                body: "Your daily pace projected to month end, and what that leaves you with. When it leaves you short, it says by how much and what the daily figure would have to become.",
              },
              {
                title: "Prices your savings honestly",
                body: "A pocket shows two completion dates: the one your stated contribution implies, and the one your forecast can actually fund. Alongside it, what a DPS at a stated rate returns over the same months, computed month by month.",
              },
            ].map((item) => (
              <article key={item.title} className="stack" style={{ gap: "var(--s-2)" }}>
                <h3 className="serif">{item.title}</h3>
                <p className="note">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <p className="eyebrow">02 &nbsp; On the arithmetic</p>
          <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)" }}>
            <p style={{ fontSize: "var(--t-lg)", lineHeight: 1.55 }}>
              A binary floating-point number cannot represent one paisa exactly. Over a savings
              schedule that compounds a rounded figure every month, the error is not theoretical —
              it shows up in the answer. Every amount here is held as an exact decimal and crosses
              every boundary as a fixed two-place string.
            </p>
            <p className="note">
              The calculation engine is checked against all twenty-five published cases, and
              separately against a second implementation of the same specification written from the
              rule text alone. They agree on every figure.
            </p>
          </div>
        </section>
      </main>

      <footer className="wrap" style={{ paddingBlock: "var(--s-6)", borderTop: "1px solid var(--rule)" }}>
        <p className="label">LSH26-T020 · Problem P12</p>
      </footer>
    </div>
  );
}
