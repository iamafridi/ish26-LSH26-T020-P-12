export const EXPENSE_CATEGORIES = [
  "Clothing", "Education", "Entertainment", "Food", "Groceries", "Health",
  "Mobile", "Rent", "Transport", "Utilities", "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface Expense {
  id: string;
  amount: string;
  date: string;
  shop: string;
  category: ExpenseCategory;
  note: string;
  source: "manual" | "receipt";
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  amount: string;
  date: string;
  shop: string;
  category: ExpenseCategory;
  note: string;
}

export interface ExpensesResponse { success: true; data: { expenses: Expense[] } }
export interface ExpenseResponse { success: true; data: { expense: Expense } }
