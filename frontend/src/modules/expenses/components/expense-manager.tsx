"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { currentDhakaDate, currentDhakaMonth } from "@/lib/date";
import { formatBDT, moneyStringToPaisa, paisaToMoneyString } from "@/lib/format-money";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { createExpense, deleteExpense, fetchExpenses, updateExpense } from "../api/expense.api";
import { expenseFormSchema } from "../schemas/expense.schema";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type ExpenseSort,
} from "../types/expense.types";

const emptyForm = (): ExpenseInput => ({
  amount: "",
  date: currentDhakaDate(),
  shop: "",
  category: "Food",
  note: "",
});

export function ExpenseManager() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(currentDhakaMonth);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ExpenseSort>("date-desc");
  const [form, setForm] = useState<ExpenseInput>(emptyForm);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetchExpenses({ month, category: category || undefined, search: search || undefined, sort }, token);
      setExpenses(response.data.expenses);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [category, month, search, sort, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadExpenses(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadExpenses, search]);

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + moneyStringToPaisa(expense.amount), 0),
    [expenses],
  );

  function updateField<TKey extends keyof ExpenseInput>(key: TKey, value: ExpenseInput[TKey]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingExpense(null);
    setForm({ ...emptyForm(), date: month === currentDhakaMonth() ? currentDhakaDate() : `${month}-01` });
    setError(null);
    setShowForm(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setForm({ amount: expense.amount, date: expense.date, shop: expense.shop, category: expense.category, note: expense.note });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const result = expenseFormSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the expense details.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      if (editingExpense) await updateExpense(editingExpense.id, result.data, token);
      else await createExpense(result.data, token);
      setShowForm(false);
      setEditingExpense(null);
      await loadExpenses();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: Expense) {
    if (!user || !window.confirm(`Delete the ${formatBDT(expense.amount)} expense at ${expense.shop}?`)) return;
    try {
      const token = await user.getIdToken();
      await deleteExpense(expense.id, token);
      await loadExpenses();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete expense.");
    }
  }

  return (
    <div className="expense-workspace">
      <div className="page-heading-row">
        <div><p className="eyebrow">EXPENSES</p><h1>Your expenses</h1></div>
        <button type="button" onClick={openCreate}>Add expense</button>
      </div>

      <section className="filter-panel" aria-label="Expense filters">
        <label>Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Shop<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shops" /></label>
        <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as ExpenseSort)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></select></label>
      </section>

      <div className="expense-summary"><span>{expenses.length} expenses</span><strong>{formatBDT(paisaToMoneyString(total))}</strong></div>
      {error && !showForm && <p className="form-error" role="alert">{error}</p>}

      {loading ? <div className="empty-card">Loading expenses…</div> : expenses.length === 0 ? (
        <div className="empty-card"><strong>No expenses found</strong><p>Add the first expense for this month or adjust the filters.</p></div>
      ) : (
        <div className="expense-list">
          {expenses.map((expense) => (
            <article className="expense-row" key={expense.id}>
              <div className="expense-category-mark" aria-hidden="true">{expense.category.slice(0, 1)}</div>
              <div className="expense-main"><strong>{expense.shop}</strong><span>{expense.category} · {expense.date}</span>{expense.note && <small>{expense.note}</small>}</div>
              <strong className="expense-amount">{formatBDT(expense.amount)}</strong>
              <div className="row-actions"><button type="button" className="text-button" onClick={() => openEdit(expense)}>Edit</button><button type="button" className="danger-button" onClick={() => void handleDelete(expense)}>Delete</button></div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="expense-form-title">
            <div className="section-heading"><div><p className="eyebrow">{editingExpense ? "EDIT" : "NEW"} EXPENSE</p><h2 id="expense-form-title">{editingExpense ? "Correct expense" : "Add expense"}</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setShowForm(false)}>×</button></div>
            <form className="form-stack" onSubmit={handleSubmit}>
              <label>Amount (BDT)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} required /></label>
              <label>Date<input type="date" max={currentDhakaDate()} value={form.date} onChange={(event) => updateField("date", event.target.value)} required /></label>
              <label>Shop or merchant<input value={form.shop} onChange={(event) => updateField("shop", event.target.value)} maxLength={120} required /></label>
              <label>Category<select value={form.category} onChange={(event) => updateField("category", event.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Note (optional)<textarea value={form.note} onChange={(event) => updateField("note", event.target.value)} maxLength={500} rows={3} /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions"><button type="button" className="secondary-button visible" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : editingExpense ? "Save changes" : "Add expense"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
