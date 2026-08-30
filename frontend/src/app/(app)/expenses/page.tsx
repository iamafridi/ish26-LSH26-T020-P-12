"use client";

import { useCallback, useEffect, useState } from "react";

import { Amount } from "@/components/money";
import { ExpenseForm, emptyDraft, type ExpenseDraft } from "@/components/expense-form";
import { MonthPicker } from "@/components/month-picker";
import { api, ApiError } from "@/lib/api";
import { currentMonth, monthLabel } from "@/lib/use-dashboard";
import type { Expense } from "@/lib/types";

/**
 * Rows per page.
 *
 * The published cases carry 41–61 expenses across two months, so a real month
 * lands somewhere around twenty-five. Twenty keeps a page inside one screen on a
 * laptop without making the paging feel constant.
 */
const PAGE_SIZE = 20;

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft(""));
  const [page, setPage] = useState(1);

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

  // A month change must reset the page, or switching from a month with four
  // pages to one with a single page lands on an empty page 4.
  useEffect(() => {
    setPage(1);
  }, [month]);

  const pageCount = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  // Deleting the last row on the final page would otherwise strand the view on a
  // page that no longer exists, so the current page is clamped on every render.
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = expenses.slice(start, start + PAGE_SIZE);

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
                  {visible.map((expense) => (
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

            {pageCount > 1 ? (
              <nav className="pager" aria-label="Expense pages">
                <p className="label pager-count">
                  {start + 1}&ndash;{Math.min(start + PAGE_SIZE, expenses.length)} of{" "}
                  {expenses.length}
                </p>

                <div className="row" style={{ gap: "var(--s-2)" }}>
                  <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                  >
                    Previous
                  </button>

                  {/* Numbered pages, but only while the count stays legible.
                      Past that, the position readout above carries the meaning
                      and a page-number strip would just wrap onto three lines. */}
                  {pageCount <= 7 ? (
                    <div className="row" style={{ gap: "var(--s-1)" }}>
                      {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                        <button
                          type="button"
                          key={number}
                          className={`btn btn--sm pager-page ${number === safePage ? "" : "btn--quiet"}`}
                          onClick={() => setPage(number)}
                          aria-current={number === safePage ? "page" : undefined}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="label mono">
                      {safePage} / {pageCount}
                    </span>
                  )}

                  <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === pageCount}
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
