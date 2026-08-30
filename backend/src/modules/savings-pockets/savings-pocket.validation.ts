import { z } from "zod";

const moneySchema = z.string().trim().regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/, "Enter a valid amount.");
const rateSchema = z.string().trim().regex(/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/, "Enter a valid annual rate.");

export const createPocketSchema = z.object({
  name: z.string().trim().min(1, "Pocket name is required.").max(80),
  itemDetails: z.string().trim().min(1, "Item details are required.").max(300),
  targetAmount: moneySchema,
  currentSavedAmount: moneySchema.optional().default("0.00"),
  monthlyContribution: moneySchema,
  annualRatePercent: rateSchema,
});

export const updatePocketSchema = createPocketSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update.",
);

export const pocketIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Use a valid pocket ID.");
