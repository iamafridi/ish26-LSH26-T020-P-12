"use client";

import { useCallback, useEffect, useState } from "react";

import { currentDhakaMonth } from "@/lib/date";
import { formatBDT } from "@/lib/format-money";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { SalaryCard } from "@/modules/salary/components/salary-card";
import { fetchDashboard } from "../api/dashboard.api";
import type { DashboardComparison, DashboardData } from "../types/dashboard.types";
import { ConnectionStatus } from "./connection-status";

function ChangeValue({ comparison }: { comparison: DashboardComparison }) {
  const amount = formatBDT(comparison.changeAmount.replace("-", ""));
  if (comparison.direction === "same") return <strong>No change</strong>;
  return (
    <strong className={comparison.direction === "increase" ? "change-up" : "change-down"}>
      {comparison.direction === "increase" ? "↑" : "↓"} {amount}
      {comparison.changePercentage !== null && ` (${Math.abs(comparison.changePercentage).toFixed(2)}%)`}
    </strong>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentDhakaMonth);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetchDashboard(month, token);
      setDashboard(response.data.dashboard);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [month, user]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const primaryComparison = dashboard?.comparison.samePeriod ?? dashboard?.comparison.fullMonth;

  return (
    <div className="dashboard-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">MONTHLY OVERVIEW</p><h1>Your monthly ledger</h1><p>See how spending compares with salary and the previous month.</p></div>
        <input aria-label="Dashboard month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>
      <ConnectionStatus />
      <SalaryCard month={month} onSaved={() => void loadDashboard()} />
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && !dashboard ? <div className="empty-card">Loading dashboard…</div> : dashboard && (
        <>
          <section className="metric-grid" aria-label="Monthly summary">
            <article><span>Total spent</span><strong>{formatBDT(dashboard.summary.totalSpent)}</strong><small>{dashboard.summary.expenseCount} expenses</small></article>
            <article><span>Against salary</span><strong>{dashboard.summary.percentageSpent === null ? "Set salary" : `${dashboard.summary.percentageSpent.toFixed(2)}%`}</strong><small>{dashboard.summary.salary ? `of ${formatBDT(dashboard.summary.salary)}` : "Salary is not configured"}</small></article>
            <article className={dashboard.summary.remaining?.startsWith("-") ? "negative" : ""}><span>{dashboard.summary.remaining?.startsWith("-") ? "Over salary" : "Money remaining"}</span><strong>{dashboard.summary.remaining === null ? "Unavailable" : formatBDT(dashboard.summary.remaining.replace("-", ""))}</strong><small>{dashboard.summary.remaining === null ? "Set salary to calculate" : "Before forecast"}</small></article>
            <article><span>Change from last month</span>{primaryComparison && <ChangeValue comparison={primaryComparison} />}<small>{dashboard.comparison.samePeriod ? `Compared through day ${dashboard.comparison.samePeriod.throughDay}` : `Compared with ${dashboard.previousMonth}`}</small></article>
          </section>

          <div className="dashboard-grid">
            <section className="dashboard-card category-card">
              <div className="card-heading"><div><p className="eyebrow">BREAKDOWN</p><h2>Spending by category</h2></div><strong>{formatBDT(dashboard.summary.totalSpent)}</strong></div>
              {dashboard.categories.length === 0 ? <div className="review-empty"><p>No expenses in this month.</p></div> : (
                <div className="category-list">
                  {dashboard.categories.map((item) => (
                    <div className="category-item" key={item.category}>
                      <div><strong>{item.category}</strong><span>{item.count} {item.count === 1 ? "expense" : "expenses"}</span></div>
                      <div className="category-track" aria-hidden="true"><span style={{ width: `${Math.max(item.sharePercentage, 1)}%` }} /></div>
                      <div><strong>{formatBDT(item.amount)}</strong><span>{item.sharePercentage.toFixed(2)}%</span></div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-card comparison-card">
              <p className="eyebrow">MONTHLY CHANGE</p><h2>{dashboard.comparison.samePeriod ? "Fair pace comparison" : "Full-month comparison"}</h2>
              {primaryComparison && <>
                <div className="comparison-values"><div><span>{dashboard.month}</span><strong>{formatBDT(primaryComparison.current)}</strong></div><div><span>{dashboard.previousMonth}</span><strong>{formatBDT(primaryComparison.previous)}</strong></div></div>
                <ChangeValue comparison={primaryComparison} />
              </>}
              {dashboard.comparison.samePeriod && <p>Both months are compared through day {dashboard.comparison.samePeriod.throughDay}, so an incomplete current month is not compared unfairly with a complete month.</p>}
            </section>
          </div>

          <section className="dashboard-card">
            <div className="card-heading"><div><p className="eyebrow">TOP FIVE</p><h2>Largest expenses</h2></div></div>
            {dashboard.largestExpenses.length === 0 ? <div className="review-empty"><p>No expenses in this month.</p></div> : (
              <div className="largest-list">
                {dashboard.largestExpenses.map((expense, index) => <article key={expense.id}><span className="rank">{index + 1}</span><div><strong>{expense.shop}</strong><small>{expense.category} · {expense.date}</small></div><strong>{formatBDT(expense.amount)}</strong></article>)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
