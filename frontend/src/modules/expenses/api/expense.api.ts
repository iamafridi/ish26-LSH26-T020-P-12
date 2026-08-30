import { apiRequest } from "@/lib/api-client";
import type { ExpenseInput, ExpenseResponse, ExpensesResponse, ExpenseSort } from "../types/expense.types";

export interface ExpenseFilters {
  month: string;
  category?: string;
  search?: string;
  sort: ExpenseSort;
}

export function fetchExpenses(filters: ExpenseFilters, token: string): Promise<ExpensesResponse> {
  const query = new URLSearchParams({ month: filters.month, sort: filters.sort });
  if (filters.category) query.set("category", filters.category);
  if (filters.search) query.set("search", filters.search);
  return apiRequest(`/expenses?${query.toString()}`, { token });
}

export function createExpense(input: ExpenseInput, token: string): Promise<ExpenseResponse> {
  return apiRequest("/expenses", { method: "POST", token, body: JSON.stringify(input) });
}

export function updateExpense(id: string, input: ExpenseInput, token: string): Promise<ExpenseResponse> {
  return apiRequest(`/expenses/${id}`, { method: "PATCH", token, body: JSON.stringify(input) });
}

export function deleteExpense(id: string, token: string): Promise<void> {
  return apiRequest(`/expenses/${id}`, { method: "DELETE", token });
}
