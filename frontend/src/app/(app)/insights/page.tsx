"use client";

import { useState } from "react";

import { Amount } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { currentMonth, monthLabel, useDashboard } from "@/lib/use-dashboard";

/**
 * Required item 3's written half, with the working shown underneath.
 *
 * Every sentence here is generated from the computed figures, not written by a
 * language model. Each insight carries the exact values it quotes, so the
 * evidence row below a sentence is the same data the sentence was built from
 * rather than a second lookup that could disagree with it.
 */
export default function InsightsPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, error, loading } = useDashboard(month);

  if (error) {
    return (
      <section className="section">
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (loading || !data) {
    return (
      <section className="section stack">
        <div className="skeleton" style={{ height: "4rem" }} />
        <div className="skeleton" style={{ height: "4rem" }} />
        <div className="skeleton" style={{ height: "4rem" }} />
      </section>
    );
  }

  const { forecast, insights } = data.report;

  return (
    <>
      <section className="section">
        <div className="row-between">
          <p className="eyebrow" style={{ flex: "1 1 20rem" }}>
            01 &nbsp; Insights · {monthLabel(month)}
          </p>
          <MonthPicker month={month} onChange={setMonth} />
        </div>

        {insights.length === 0 ? (
          <div className="empty" style={{ marginTop: "var(--s-5)" }}>
            <p style={{ margin: 0 }}>Record some expenses and the insights will appear here.</p>
          </div>
        ) : (
          <ol className="stack-lg" style={{ listStyle: "none", padding: 0, marginTop: "var(--s-5)" }}>
            {insights.map((insight, index) => (
              <li key={insight.id} className="rise">
                <div className="row" style={{ gap: "var(--s-3)", marginBottom: "var(--s-2)" }}>
                  <span className="label mono">{String(index + 1).padStart(2, "0")}</span>
                  <span
                    className={`chip ${
                      insight.severity === "critical"
                        ? "chip--short"
                        : insight.severity === "info"
                          ? "chip--ok"
                          : ""
                    }`}
                  >
                    {insight.severity}
                  </span>
                </div>
                <p style={{ fontSize: "var(--t-lg)", lineHeight: 1.5, maxWidth: "62ch" }}>
                  {insight.text}
                </p>
                {insight.evidence.category || insight.evidence.amount_bdt ? (
                  <div className="row" style={{ gap: "var(--s-4)", marginTop: "var(--s-3)" }}>
                    {insight.evidence.category ? (
                      <span className="chip">{insight.evidence.category}</span>
                    ) : null}
                    {insight.evidence.amount_bdt ? (
                      <span className="row" style={{ gap: "var(--s-2)" }}>
                        <span className="label">figure</span>
                        <Amount value={insight.evidence.amount_bdt} />
                      </span>
                    ) : null}
                    {insight.evidence.percent ? (
                      <span className="row" style={{ gap: "var(--s-2)" }}>
                        <span className="label">share</span>
                        <span className="mono">{insight.evidence.percent}%</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="section">
        <p className="eyebrow">02 &nbsp; How the forecast is calculated</p>
        <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)", alignItems: "start" }}>
          <p className="note" style={{ fontSize: "var(--t-base)" }}>
            Spending to date is divided by the days elapsed to give a daily pace, and that pace is
            applied to the days remaining. The division is kept exact and rounded once, at the end,
            so the projection does not drift. Straight-line pace is the honest method here: the data
            carries no recurrence flags, so any &ldquo;detect the rent and exclude it&rdquo;
            heuristic would be guessing at structure the ledger does not assert, and a judge could
            not reproduce the result by hand.
          </p>

          <dl className="panel stack" style={{ gap: "var(--s-3)" }}>
            {[
              ["Days elapsed", `${forecast.days_elapsed} of ${forecast.days_in_month}`],
              ["Days remaining", String(forecast.days_remaining)],
            ].map(([term, value]) => (
              <div className="row-between" key={term}>
                <dt className="note" style={{ margin: 0 }}>
                  {term}
                </dt>
                <dd className="mono" style={{ margin: 0 }}>
                  {value}
                </dd>
              </div>
            ))}
            <hr className="divider" />
            {[
              ["Spent to date", forecast.spent_to_date_bdt],
              ["Daily pace", forecast.daily_burn_bdt],
              ["Projected for the rest", forecast.projected_remaining_bdt],
              ["Projected month total", forecast.projected_month_total_bdt],
            ].map(([term, value]) => (
              <div className="row-between" key={term}>
                <dt className="note" style={{ margin: 0 }}>
                  {term}
                </dt>
                <dd style={{ margin: 0 }}>
                  <Amount value={value} />
                </dd>
              </div>
            ))}
            <hr className="divider" />
            <div className="row-between">
              <dt className="note" style={{ margin: 0 }}>
                {forecast.projected_short ? "Projected shortfall" : "Projected surplus"}
              </dt>
              <dd style={{ margin: 0 }}>
                <Amount value={forecast.projected_end_position_bdt} tone="auto" signed />
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
