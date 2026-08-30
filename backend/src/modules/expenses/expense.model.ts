import mongoose, { model, Schema, type InferSchemaType, type Model } from "mongoose";

const { models } = mongoose;

import { EXPENSE_CATEGORIES } from "./expense.constants.js";

const expenseSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, trim: true },
    amountPaisa: { type: Number, required: true, min: 1 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    shop: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, enum: EXPENSE_CATEGORIES },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    source: { type: String, enum: ["manual", "receipt"], default: "manual" },
  },
  { timestamps: true, versionKey: false },
);

expenseSchema.index({ firebaseUid: 1, month: 1, date: -1 });
expenseSchema.index({ firebaseUid: 1, month: 1, category: 1 });

export type ExpenseDocument = InferSchemaType<typeof expenseSchema> & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseFields = InferSchemaType<typeof expenseSchema>;
export const ExpenseModel: Model<ExpenseFields> =
  (models.Expense as Model<ExpenseFields> | undefined) ?? model<ExpenseFields>("Expense", expenseSchema);
