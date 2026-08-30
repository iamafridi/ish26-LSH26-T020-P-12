import { z } from "zod";

const money = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, "Enter a valid amount.");

export const pocketFormSchema = z.object({
  name: z.string().trim().min(1, "Pocket name is required.").max(80),
  itemDetails: z.string().trim().min(1, "Item details are required.").max(300),
  targetAmount: money,
  currentSavedAmount: money,
  monthlyContribution: money,
  annualRatePercent: z.string().regex(/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/, "Enter a valid DPS rate."),
});
