"use client";

import Link from "next/link";
import { useState } from "react";

import { Amount } from "@/components/money";
import { CategoryBars, RunwayBar } from "@/components/charts";
import { CategoryDonut } from "@/components/donut";
import { MonthPicker } from "@/components/month-picker";
import { LoadSampleCase } from "@/components/load-sample-case";
import { absolute } from "@/lib/money";
import { currentMonth, monthLabel, useDashboard } from "@/lib/use-dashboard";

/**
 * Required item 2 in full — total spent against salary, the category breakdown,
 * the largest expenses and the change against last month — with the headline of
 * required item 3 sitting above it, because "am I going to make it to month end"
 * is the question someone opens this app to answer.
 */
export default function DashboardPage() {
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
        <div className="skeleton" style={{ height: "1.5rem", width: "12rem" }} />
        <div className="skeleton" style={{ height: "5rem" }} />
        <div className="skeleton" style={{ height: "12rem" }} />
      </section>
    );
  }

  const { report } = data;
  const { forecast, comparison } = report;
  const short = forecast.projected_short;
  const noData = comparison.this_month.expense_count === 0;

  return (
    <>
      <section className="section">
        <div className="row-between">
          <p className="eyebrow" style={{ flex: "1 1 20rem" }}>
            01 &nbsp; {monthLabel(month)}
          </p>
          <MonthPicker month={month} onChange={setMonth} />
        </div>

        {noData ? (
          <div className="empty" style={{ marginTop: "var(--s-5)" }}>
            <p style={{ marginBottom: "var(--s-4)" }}>
              Nothing recorded for {monthLabel(month)} yet.
            </p>
            <div className="row" style={{ justifyContent: "center" }}>
              <Link className="btn" href="/expenses">
                Add an expense
              </Link>
              <Link className="btn btn--quiet" href="/receipts">
                Scan a receipt
              </Link>
            </div>
            <hr className="divider" style={{ marginBlock: "var(--s-5)" }} />
            <LoadSampleCase onLoaded={setMonth} />
          </div>
        ) : (
          <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)", alignItems: "start" }}>
            <div className="stack-lg">
              <div className="figure-block">
                <p className="label">
                  {short ? "Projected shortfall at month end" : "Projected to be left at month end"}
                </p>
                {/* The sign is stripped because the label above already says
                    which way it goes, so the tone has to be stated rather than
                    inferred — otherwise a shortfall renders in the surplus
                    colour and contradicts its own heading. */}
                <Amount
                  value={absolute(forecast.projected_end_position_bdt)}
                  size="display"
                  tone={short ? "short" : "surplus"}
                />
                <p className="note">
                  {forecast.days_elapsed} of {forecast.days_in_month} days elapsed, at{" "}
                  <Amount value={forecast.daily_burn_bdt} /> a day.{" "}
                  {short
                    ? "Spending is running ahead of this month's salary."
                    : "Spending is inside this month's salary."}
                </p>
              </div>

              <RunwayBar
                salary={forecast.salary_bdt}
                spent={forecast.spent_to_date_bdt}
                projectedRemaining={forecast.projected_remaining_bdt}
              />
            </div>

            <dl className="panel stack" style={{ gap: "var(--s-3)" }}>
              {[
                ["Salary", forecast.salary_bdt],
                ["Spent so far", forecast.spent_to_date_bdt],
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
                  After pocket contributions
                </dt>
                <dd style={{ margin: 0 }}>
                  <Amount
                    value={forecast.projected_end_position_after_pockets_bdt}
                    tone="auto"
                    signed
                  />
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {!noData && (
        <>
          <section className="section">
            <p className="eyebrow">02 &nbsp; Where it went</p>
            <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)", alignItems: "start" }}>
              <div className="panel">
                <div className="panel-head">
                  <h2 style={{ fontSize: "var(--t-lg)" }}>By category</h2>
                  <span className="label">
                    {comparison.this_month.expense_count} entries ·{" "}
                    <Amount value={comparison.this_month.total_spent_bdt} />
                  </span>
                </div>

                <div className="grid grid-2" style={{ alignItems: "center" }}>
                  <CategoryDonut
                    lines={comparison.this_month.by_category}
                    total={comparison.this_month.total_spent_bdt}
                  />
                  <CategoryBars lines={comparison.this_month.by_category} />
                </div>
              </div>

              <div className="panel panel--flush">
                <div className="panel-head" style={{ padding: "var(--s-5) var(--s-5) var(--s-3)", margin: 0 }}>
                  <h2 style={{ fontSize: "var(--t-lg)" }}>Largest expenses</h2>
                </div>
                <div className="ledger-scroll">
                  <table className="ledger">
                    <caption className="sr-only">
                      The five largest single expenses in {monthLabel(month)}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Shop</th>
                        <th scope="col">Date</th>
                        <th scope="col" className="num">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.this_month.largest_expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>
                            {expense.shop}
                            <br />
                            <span className="faint" style={{ fontSize: "var(--t-xs)" }}>
                              {expense.category}
                            </span>
                          </td>
                          <td className="mono faint" style={{ fontSize: "var(--t-xs)" }}>
                            {expense.date}
                          </td>
                          <td className="num">
                            <Amount value={expense.amount_bdt} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="row-between">
              <p className="eyebrow" style={{ flex: "1 1 20rem" }}>
                03 &nbsp; Against {monthLabel(comparison.last_month.month)}
              </p>
              <span className="row" style={{ gap: "var(--s-2)" }}>
                <Amount value={comparison.delta_bdt} tone="auto" signed />
                {comparison.delta_percent !== null ? (
                  <span className="chip">{comparison.delta_percent}%</span>
                ) : null}
              </span>
            </div>

            <div className="panel panel--flush" style={{ marginTop: "var(--s-5)" }}>
              <div className="ledger-scroll">
                <table className="ledger">
                  <caption className="sr-only">
                    Category totals compared with the previous month
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col" className="num">
                        {monthLabel(comparison.last_month.month)}
                      </th>
                      <th scope="col" className="num">
                        {monthLabel(comparison.this_month.month)}
                      </th>
                      <th scope="col" className="num">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.category_deltas.map((row) => (
                      <tr key={row.category}>
                        <td>{row.category}</td>
                        <td className="num muted">
                          <Amount value={row.last_bdt} />
                        </td>
                        <td className="num">
                          <Amount value={row.this_bdt} />
                        </td>
                        <td className="num">
                          <Amount value={row.delta_bdt} tone="auto" signed />
                          {row.delta_percent !== null ? (
                            <span
                              className="faint mono"
                              style={{ fontSize: "var(--t-xs)", marginLeft: "var(--s-2)" }}
                            >
                              {row.delta_percent}%
                            </span>
                          ) : (
                            <span
                              className="faint"
                              style={{ fontSize: "var(--t-xs)", marginLeft: "var(--s-2)" }}
                            >
                              new
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="row-between">
              <p className="eyebrow" style={{ flex: "1 1 20rem" }}>
                04 &nbsp; What that means
              </p>
              <Link className="btn btn--quiet btn--sm" href="/insights">
                All insights
              </Link>
            </div>
            <ul className="stack" style={{ listStyle: "none", padding: 0, marginTop: "var(--s-5)" }}>
              {report.insights.slice(0, 3).map((insight) => (
                <li
                  key={insight.id}
                  className={`alert rise ${insight.severity === "critical" ? "alert--error" : ""}`}
                >
                  {insight.text}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
