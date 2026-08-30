"use client";

import { useCallback, useEffect, useState } from "react";

import { Amount } from "@/components/money";
import { ExpenseForm, emptyDraft, type ExpenseDraft } from "@/components/expense-form";
import { MonthPicker } from "@/components/month-picker";
import { api, ApiError } from "@/lib/api";
import { currentMonth, monthLabel } from "@/lib/use-dashboard";
import type { Expense } from "@/lib/types";

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft(""));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { expenses: rows } = await api<{ expenses: Expense[] }>(`/expenses?month=${month}`);
      setExpenses(rows);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load your expenses.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    // Optimistic, with a restore on failure: deleting a row should feel
    // instant, and a failed delete that silently left the row gone would be
    // worse than a brief flicker.
    const previous = expenses;
    setExpenses(expenses.filter((expense) => expense.id !== id));
    try {
      await api(`/expenses/${id}`, { method: "DELETE" });
    } catch {
      setExpenses(previous);
      setError("Could not delete that expense.");
    }
  }

  return (
    <>
      <section className="section">
        <div className="row-between">
          <p className="eyebrow" style={{ flex: "1 1 20rem" }}>
            01 &nbsp; Expenses · {monthLabel(month)}
          </p>
          <div className="row" style={{ gap: "var(--s-3)" }}>
            <MonthPicker month={month} onChange={setMonth} />
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setDraft(emptyDraft(`${month}-01`));
                setAdding((open) => !open);
              }}
            >
              {adding ? "Close" : "Add expense"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="alert alert--error" role="alert" style={{ marginTop: "var(--s-4)" }}>
            {error}
          </p>
        ) : null}

        {adding ? (
          <div className="panel" style={{ marginTop: "var(--s-5)" }}>
            <div className="panel-head">
              <h2 style={{ fontSize: "var(--t-lg)" }}>New expense</h2>
            </div>
            <ExpenseForm
              draft={draft}
              onDraftChange={setDraft}
              source="manual"
              onSaved={(expense) => {
                setExpenses([expense, ...expenses]);
                setAdding(false);
                setDraft(emptyDraft(`${month}-01`));
              }}
            />
          </div>
        ) : null}
      </section>

      <section className="section">
        {loading ? (
          <div className="stack">
            {[0, 1, 2, 3].map((row) => (
              <div className="skeleton" key={row} style={{ height: "2.5rem" }} />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty">
            <p style={{ margin: 0 }}>No expenses recorded for {monthLabel(month)}.</p>
          </div>
        ) : (
          <div className="panel panel--flush">
            <div className="ledger-scroll">
              <table className="ledger">
                <caption className="sr-only">Expenses recorded in {monthLabel(month)}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Shop</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                    <th scope="col" className="shrink">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="mono faint nowrap" style={{ fontSize: "var(--t-xs)" }}>
                        {expense.date}
                      </td>
                      <td>
                        {expense.shop}
                        {expense.source === "receipt" ? (
                          <span className="chip" style={{ marginLeft: "var(--s-2)" }}>
                            receipt
                          </span>
                        ) : null}
                        {expense.note ? (
                          <>
                            <br />
                            <span className="faint" style={{ fontSize: "var(--t-xs)" }}>
                              {expense.note}
                            </span>
                          </>
                        ) : null}
                      </td>
                      <td className="muted">{expense.category}</td>
                      <td className="num">
                        <Amount value={expense.amount_bdt} />
                      </td>
                      <td className="shrink">
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => void remove(expense.id)}
                          aria-label={`Delete ${expense.shop} on ${expense.date}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
