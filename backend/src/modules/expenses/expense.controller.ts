import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/app-error.js";
import { parseInput } from "../../shared/validation/validation.js";
import { createExpense, getExpense, listExpenses, removeExpense, updateExpense } from "./expense.service.js";
import { createExpenseSchema, expenseIdSchema, expenseQuerySchema, updateExpenseSchema } from "./expense.validation.js";

function userId(request: Request): string {
  if (!request.authenticatedUser) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return request.authenticatedUser.uid;
}

export async function list(request: Request, response: Response): Promise<void> {
  const filters = parseInput(expenseQuerySchema, request.query);
  response.json({ success: true, data: { expenses: await listExpenses(userId(request), filters) } });
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const id = parseInput(expenseIdSchema, request.params.id);
  response.json({ success: true, data: { expense: await getExpense(userId(request), id) } });
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = parseInput(createExpenseSchema, request.body);
  response.status(201).json({ success: true, data: { expense: await createExpense(userId(request), input) } });
}

export async function update(request: Request, response: Response): Promise<void> {
  const id = parseInput(expenseIdSchema, request.params.id);
  const input = parseInput(updateExpenseSchema, request.body);
  response.json({ success: true, data: { expense: await updateExpense(userId(request), id, input) } });
}

export async function remove(request: Request, response: Response): Promise<void> {
  const id = parseInput(expenseIdSchema, request.params.id);
  await removeExpense(userId(request), id);
  response.status(204).send();
}
