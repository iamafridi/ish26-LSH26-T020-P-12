export const EXPENSE_CATEGORIES = [
  "Clothing", "Education", "Entertainment", "Food", "Groceries", "Health",
  "Mobile", "Rent", "Transport", "Utilities", "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
