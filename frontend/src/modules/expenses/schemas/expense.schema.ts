import { z } from "zod";

import { EXPENSE_CATEGORIES } from "../types/expense.types";

export const expenseFormSchema = z.object({
  amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, "Enter a valid amount."),
  date: z.string().date("Select a valid date."),
  shop: z.string().trim().min(1, "Shop is required.").max(120),
  category: z.enum(EXPENSE_CATEGORIES),
  note: z.string().trim().max(500),
});
