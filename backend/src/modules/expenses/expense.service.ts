import { AppError } from "../../shared/errors/app-error.js";
import { moneyStringToPaisa, paisaToMoneyString } from "../../shared/money/money.js";
import type { ExpenseCategory } from "./expense.constants.js";
import {
  createOwnedExpense,
  deleteOwnedExpense,
  findOwnedExpense,
  listOwnedExpenses,
  updateOwnedExpense,
  type ExpenseFilters,
  type ExpenseWrite,
} from "./expense.repository.js";

interface ExpenseInput {
  amount: string;
  date: string;
  shop: string;
  category: ExpenseCategory;
  note?: string;
}

function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function ensureNotFuture(date: string): void {
  if (date > dhakaToday()) {
    throw new AppError(400, "VALIDATION_ERROR", "Expense date cannot be in the future.");
  }
}

function serializeExpense(expense: NonNullable<Awaited<ReturnType<typeof findOwnedExpense>>>) {
  return {
    id: expense._id.toString(),
    amount: paisaToMoneyString(expense.amountPaisa),
    date: expense.date,
    shop: expense.shop,
    category: expense.category,
    note: expense.note,
    source: expense.source,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

function toWrite(input: ExpenseInput): ExpenseWrite {
  ensureNotFuture(input.date);
  const amountPaisa = moneyStringToPaisa(input.amount);
  if (amountPaisa <= 0) throw new AppError(400, "VALIDATION_ERROR", "Expense amount must be greater than zero.");
  return {
    amountPaisa,
    date: input.date,
    month: input.date.slice(0, 7),
    shop: input.shop,
    category: input.category,
    note: input.note ?? "",
  };
}

export async function listExpenses(firebaseUid: string, filters: ExpenseFilters) {
  return (await listOwnedExpenses(firebaseUid, filters)).map(serializeExpense);
}

export async function getExpense(firebaseUid: string, id: string) {
  const expense = await findOwnedExpense(firebaseUid, id);
  if (!expense) throw new AppError(404, "NOT_FOUND", "Expense not found.");
  return serializeExpense(expense);
}

export async function createExpense(firebaseUid: string, input: ExpenseInput) {
  return serializeExpense(await createOwnedExpense(firebaseUid, toWrite(input)));
}

export async function updateExpense(firebaseUid: string, id: string, input: Partial<ExpenseInput>) {
  const existing = await findOwnedExpense(firebaseUid, id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found.");

  const write: Partial<ExpenseWrite> = {};
  if (input.amount !== undefined) {
    const amountPaisa = moneyStringToPaisa(input.amount);
    if (amountPaisa <= 0) throw new AppError(400, "VALIDATION_ERROR", "Expense amount must be greater than zero.");
    write.amountPaisa = amountPaisa;
  }
  if (input.date !== undefined) {
    ensureNotFuture(input.date);
    write.date = input.date;
    write.month = input.date.slice(0, 7);
  }
  if (input.shop !== undefined) write.shop = input.shop;
  if (input.category !== undefined) write.category = input.category;
  if (input.note !== undefined) write.note = input.note;

  const updated = await updateOwnedExpense(firebaseUid, id, write);
  if (!updated) throw new AppError(404, "NOT_FOUND", "Expense not found.");
  return serializeExpense(updated);
}

export async function removeExpense(firebaseUid: string, id: string): Promise<void> {
  if (!(await deleteOwnedExpense(firebaseUid, id))) {
    throw new AppError(404, "NOT_FOUND", "Expense not found.");
  }
}
