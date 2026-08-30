import { apiRequest } from "@/lib/api-client";
import type { ExpenseInput, ExpenseResponse } from "@/modules/expenses/types/expense.types";
import type { ReceiptExtractionResponse } from "../types/receipt.types";

export function extractReceipt(file: File, token: string): Promise<ReceiptExtractionResponse> {
  const body = new FormData();
  body.append("receipt", file);
  return apiRequest("/receipts/extract", { method: "POST", token, body });
}

export function confirmReceiptExpense(input: ExpenseInput, token: string): Promise<ExpenseResponse> {
  return apiRequest("/receipts/confirm", { method: "POST", token, body: JSON.stringify(input) });
}
