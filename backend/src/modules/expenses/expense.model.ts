import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { CATEGORIES } from "../../shared/ocr/types.js";
import { DATE_PATTERN, MONTH_PATTERN, moneyField } from "../../shared/db/money-field.js";

const expenseSchema = new Schema(
  {
    uid: { type: String, required: true, trim: true, index: true },
    date: { type: String, required: true, match: DATE_PATTERN },
    /**
     * Denormalised from `date`. Every dashboard read filters by month, and an
     * index on a stored month is a range-free equality lookup; deriving it in a
     * query would mean a collection scan with a $substr expression.
     * Kept in sync in one place — see `expense.service.ts`.
     */
    month: { type: String, required: true, match: MONTH_PATTERN },
    category: { type: String, required: true, enum: CATEGORIES },
    shop: { type: String, required: true, trim: true, maxlength: 120 },
    amount_bdt: moneyField(),
    /** Manual entry or a reviewed receipt scan. Drives the provenance chip. */
    source: { type: String, enum: ["manual", "receipt"], default: "manual" },
    note: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true, versionKey: false },
);

expenseSchema.index({ uid: 1, month: 1, date: -1 });
expenseSchema.index({ uid: 1, month: 1, category: 1 });

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>;

/**
 * `mongoose.models` is consulted first so a dev-server hot reload reuses the
 * compiled model instead of throwing OverwriteModelError on re-registration.
 * The cast restores the document type, which the lookup erases.
 */
export const ExpenseModel = (mongoose.models["Expense"] as Model<ExpenseDocument> | undefined) ??
  mongoose.model<ExpenseDocument>("Expense", expenseSchema);
