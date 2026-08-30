import { z } from "zod";

export const monthSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Use a valid YYYY-MM month.");

export const setSalarySchema = z.object({
  amount: z.string().trim().regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/, "Enter a valid amount."),
});
