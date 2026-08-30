import { z } from "zod";

import { EXPENSE_CATEGORIES } from "./expense.constants.js";

const dateSchema = z.string().date("Use a valid YYYY-MM-DD date.");
const amountSchema = z.string().trim().regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/, "Enter a valid amount.");

export const createExpenseSchema = z.object({
  amount: amountSchema,
  date: dateSchema,
  shop: z.string().trim().min(1, "Shop is required.").max(120),
  category: z.enum(EXPENSE_CATEGORIES),
  note: z.string().trim().max(500).optional().default(""),
});

export const updateExpenseSchema = createExpenseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update.",
);

export const expenseIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Use a valid expense ID.");

export const expenseQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(["date-desc", "date-asc", "amount-desc", "amount-asc"]).default("date-desc"),
});
