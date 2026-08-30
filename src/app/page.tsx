/**
 * The dashboard — all four required items on one screen.
 *
 * OWNER: Claude.
 *
 * This component renders. It does not compute. Every figure below comes from
 * `useReport()` -> `buildReport()` in src/core/. If you find yourself adding two
 * amounts here, add the function to src/core/ instead — see
 * docs/ARCHITECTURE.md §2.
 */
"use client";

import { useEffect, useState } from "react";
import dataset from "@/data/p12-public.json";
import { display, money, type Money } from "@/core/money";
import { formatMonthLong } from "@/core/calendar";
import { CaseSchema, type LedgerCase } from "@/core/types";
import { useLedgerStore, useReport } from "@/store/ledger-store";
import { ReceiptCapture } from "@/components/receipt-capture";

const cases = dataset.cases as unknown as LedgerCase[];
// Accepts either the canonical string form the engine emits or a Decimal, so
// call sites like `money(x).abs()` don't need an extra round-trip through fmt().
const taka = (v: string | Money) => `৳${display(money(v))}`;

function Stat({ label, value, tone = "plain", sub }: {
  label: string; value: string; tone?: "plain" | "good" | "bad"; sub?: string;
}) {
  const colour =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${colour}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Dashboard() {
  const { activeCase, loadCase, setSalary } = useLedgerStore();
  const report = useReport();
  const [salaryDraft, setSalaryDraft] = useState("");

  // Seed from the first official case on first visit so the app is never empty.
  useEffect(() => {
    if (!activeCase) loadCase(CaseSchema.parse(cases[0]));
  }, [activeCase, loadCase]);

  useEffect(() => {
    if (activeCase) setSalaryDraft(activeCase.salary_bdt);
  }, [activeCase?.case_id, activeCase?.salary_bdt]);

  if (!activeCase || !report) {
    return <main className="p-8 text-sm text-slate-500">Loading ledger…</main>;
  }

  const { comparison, forecast, insights, pockets } = report;
  const thisMonth = comparison.this_month;
  const spentPct = money(thisMonth.total_spent_bdt)
    .dividedBy(money(forecast.salary_bdt))
    .times(100);

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Personal Ledger</h1>
          <p className="text-xs text-slate-500">
            {formatMonthLong(thisMonth.month)} · as at {forecast.today} · day {forecast.days_elapsed} of{" "}
            {forecast.days_in_month}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <label className="block">
            <span className="text-[11px] font-medium text-slate-600">Monthly salary</span>
            <div className="mt-1 flex gap-1">
              <input
                value={salaryDraft}
                onChange={(e) => setSalaryDraft(e.target.value)}
                className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-xs tabular-nums"
              />
              <button
                onClick={() => /^\d+(\.\d{1,2})?$/.test(salaryDraft) && setSalary(
                  salaryDraft.includes(".")
                    ? `${salaryDraft.split(".")[0]}.${salaryDraft.split(".")[1].padEnd(2, "0").slice(0, 2)}`
                    : `${salaryDraft}.00`,
                )}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                Set
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-medium text-slate-600">Sample case</span>
            <select
              value={activeCase.case_id}
              onChange={(e) => {
                const next = cases.find((c) => c.case_id === e.target.value);
                if (next) loadCase(CaseSchema.parse(next));
              }}
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            >
              {cases.map((c) => (
                <option key={c.case_id} value={c.case_id}>{c.case_id}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* ---------------------------------------------- required item 2 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Spent this month"
          value={taka(thisMonth.total_spent_bdt)}
          sub={`${spentPct.toDecimalPlaces(1).toFixed(1)}% of ${taka(forecast.salary_bdt)} salary · ${thisMonth.expense_count} expenses`}
        />
        <Stat
          label="Projected month total"
          value={taka(forecast.projected_month_total_bdt)}
          sub={`${taka(forecast.daily_burn_bdt)}/day × ${forecast.days_remaining} days remaining`}
        />
        <Stat
          label={forecast.projected_short ? "Projected shortfall" : "Projected left at month end"}
          value={taka(money(forecast.projected_end_position_bdt).abs())}
          tone={forecast.projected_short ? "bad" : "good"}
          sub={forecast.projected_short ? "Spending outpaces salary" : "Before pocket contributions"}
        />
        <Stat
          label="vs last month"
          value={`${money(comparison.delta_bdt).isNegative() ? "−" : "+"}${taka(money(comparison.delta_bdt).abs())}`}
          tone={money(comparison.delta_bdt).isNegative() ? "good" : "bad"}
          sub={
            comparison.delta_percent === null
              ? `${formatMonthLong(comparison.last_month.month)} had no spending`
              : `${comparison.delta_percent}% vs ${formatMonthLong(comparison.last_month.month)}`
          }
        />
      </div>

      {/* ---------------------------------------------- required item 3 */}
      <Card
        title="What the numbers say"
        hint="Generated from your actual figures — every amount below is computed, not estimated."
      >
        <ul className="space-y-2">
          {insights.map((i) => (
            <li
              key={i.id}
              className={`rounded-lg border-l-2 px-3 py-2 text-xs leading-relaxed ${
                i.severity === "critical"
                  ? "border-rose-400 bg-rose-50 text-rose-900"
                  : i.severity === "warning"
                    ? "border-amber-400 bg-amber-50 text-amber-900"
                    : "border-slate-300 bg-slate-50 text-slate-700"
              }`}
            >
              {i.text}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Where it went" hint={`By category, ${formatMonthLong(thisMonth.month)}`}>
          <div className="space-y-2">
            {thisMonth.by_category.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">{c.category}</span>
                  <span className="tabular-nums text-slate-900">
                    {taka(c.total_bdt)} <span className="text-slate-400">· {c.share_percent}%</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-800" style={{ width: `${c.share_percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Largest expenses" hint="This month's biggest single transactions">
          <table className="w-full text-xs">
            <tbody>
              {thisMonth.largest_expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 text-slate-900">{e.shop}</td>
                  <td className="py-1.5 text-slate-500">{e.category}</td>
                  <td className="py-1.5 text-slate-400">{e.date}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">
                    {taka(e.amount_bdt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card
        title={`Month-over-month movement`}
        hint={`${formatMonthLong(comparison.last_month.month)} → ${formatMonthLong(thisMonth.month)}, biggest change first`}
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="pb-1 font-medium">Category</th>
              <th className="pb-1 text-right font-medium">Last</th>
              <th className="pb-1 text-right font-medium">This</th>
              <th className="pb-1 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {comparison.category_deltas.slice(0, 8).map((d) => {
              const up = money(d.delta_bdt).greaterThan(0);
              return (
                <tr key={d.category} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 text-slate-700">{d.category}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-500">{taka(d.last_bdt)}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-900">{taka(d.this_bdt)}</td>
                  <td className={`py-1.5 text-right tabular-nums ${up ? "text-rose-600" : "text-emerald-600"}`}>
                    {up ? "+" : "−"}{taka(money(d.delta_bdt).abs())}
                    {d.delta_percent !== null && (
                      <span className="text-slate-400"> · {d.delta_percent}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ---------------------------------------------- required item 4 */}
      <Card
        title="Savings pockets"
        hint={`Completion projected from your contribution. DPS shown at the stated ${pockets[0]?.dps.annual_rate_percent ?? "—"}% annual rate, compounded monthly.`}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {pockets.map((p) => (
            <div key={p.pocket.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-900">{p.pocket.name}</span>
                <span className="text-xs tabular-nums text-slate-500">{taka(p.pocket.target_bdt)}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{p.pocket.item}</p>

              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Monthly</dt>
                  <dd className="tabular-nums text-slate-900">{taka(p.pocket.monthly_contribution_bdt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Completes</dt>
                  <dd className="tabular-nums text-slate-900">
                    {p.expected_completion_date}
                    <span className="text-slate-400"> · {p.months_to_target}m</span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">DPS at maturity</dt>
                  <dd className="tabular-nums text-slate-900">{taka(p.dps.maturity_value_bdt)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <dt className="text-slate-500">Interest earned</dt>
                  <dd className="font-medium tabular-nums text-emerald-600">+{taka(p.dps_gain_bdt)}</dd>
                </div>
              </dl>

              <p
                className={`mt-3 rounded px-2 py-1 text-[11px] ${
                  p.affordable_this_month
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {p.affordable_this_month
                  ? "Affordable at this month's pace"
                  : "Not affordable at this month's pace"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ---------------------------------------------- required item 1 */}
      <ReceiptCapture />

      <footer className="pb-4 text-[11px] text-slate-400">
        Forecast method: daily burn = spent to date ÷ {forecast.days_elapsed} days elapsed, projected
        over {forecast.days_remaining} remaining days. All amounts exact to the paisa — see
        docs/ARCHITECTURE.md.
      </footer>
    </main>
  );
}
