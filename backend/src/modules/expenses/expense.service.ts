/**
 * Expenses — required item 1's "add expenses", and the raw material every other
 * required item is computed from.
 */
import { z } from "zod";

import { ExpenseModel } from "./expense.model.js";
import { notFoundError } from "../../shared/errors/app-error.js";
import {
  CategoryInput,
  DateInput,
  MoneyInput,
  MonthInput,
  ObjectIdInput,
} from "../../shared/validation/schemas.js";

export const CreateExpenseSchema = z.object({
  date: DateInput,
  category: CategoryInput,
  shop: z.string().trim().min(1, "Where was it spent?").max(120),
  amount_bdt: MoneyInput,
  source: z.enum(["manual", "receipt"]).default("manual"),
  note: z.string().trim().max(500).default(""),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const ListExpenseQuery = z.object({
  month: MonthInput.optional(),
  category: CategoryInput.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type CreateExpenseInput = z.output<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.output<typeof UpdateExpenseSchema>;

export interface ExpenseView {
  id: string;
  date: string;
  month: string;
  category: string;
  shop: string;
  amount_bdt: string;
  source: string;
  note: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toView(doc: any): ExpenseView {
  return {
    id: String(doc._id),
    date: doc.date,
    month: doc.month,
    category: doc.category,
    shop: doc.shop,
    amount_bdt: doc.amount_bdt,
    source: doc.source ?? "manual",
    note: doc.note ?? "",
  };
}

export async function listExpenses(
  uid: string,
  query: z.output<typeof ListExpenseQuery>,
): Promise<ExpenseView[]> {
  const filter: Record<string, unknown> = { uid };
  if (query.month) filter["month"] = query.month;
  if (query.category) filter["category"] = query.category;

  const docs = await ExpenseModel.find(filter).sort({ date: -1, createdAt: -1 }).limit(query.limit).lean();
  return docs.map(toView);
}

/** Every expense in either of two months — exactly what the dashboard needs. */
export async function listExpensesForMonths(uid: string, months: string[]): Promise<ExpenseView[]> {
  const docs = await ExpenseModel.find({ uid, month: { $in: months } })
    .sort({ date: 1, createdAt: 1 })
    .lean();
  return docs.map(toView);
}

export async function createExpense(uid: string, input: CreateExpenseInput): Promise<ExpenseView> {
  // `month` is derived here and nowhere else, so a date and its month can never
  // disagree — the bug that would quietly drop a row out of the dashboard.
  const created = await ExpenseModel.create({ ...input, uid, month: input.date.slice(0, 7) });
  return toView(created.toObject());
}

export async function updateExpense(
  uid: string,
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseView> {
  ObjectIdInput.parse(id);

  const patch: Record<string, unknown> = { ...input };
  if (input.date) patch["month"] = input.date.slice(0, 7);

  // The uid is part of the filter, not just the payload: an authenticated user
  // must not be able to edit another user's row by guessing its id.
  const updated = await ExpenseModel.findOneAndUpdate({ _id: id, uid }, patch, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) throw notFoundError("That expense does not exist.");
  return toView(updated);
}

export async function deleteExpense(uid: string, id: string): Promise<void> {
  ObjectIdInput.parse(id);
  const result = await ExpenseModel.deleteOne({ _id: id, uid });
  if (result.deletedCount === 0) throw notFoundError("That expense does not exist.");
}
