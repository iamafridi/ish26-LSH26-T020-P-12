import type { Request, Response } from "express";

import { createReceiptExpense } from "../expenses/expense.service.js";
import { createExpenseSchema } from "../expenses/expense.validation.js";
import { AppError } from "../../shared/errors/app-error.js";
import { parseInput } from "../../shared/validation/validation.js";
import { extractReceipt } from "./receipt.service.js";

export async function extract(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: { extraction: await extractReceipt(request.file) } });
}

export async function confirm(request: Request, response: Response): Promise<void> {
  if (!request.authenticatedUser) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const input = parseInput(createExpenseSchema, request.body);
  const expense = await createReceiptExpense(request.authenticatedUser.uid, input);
  response.status(201).json({ success: true, data: { expense } });
}
