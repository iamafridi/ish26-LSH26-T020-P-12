import { ExpenseModel, type ExpenseDocument } from "./expense.model.js";
import type { ExpenseCategory } from "./expense.constants.js";

export interface ExpenseFilters {
  month?: string;
  category?: ExpenseCategory;
  search?: string;
  sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

export interface ExpenseWrite {
  amountPaisa: number;
  date: string;
  month: string;
  shop: string;
  category: ExpenseCategory;
  note: string;
}

const sortMap = {
  "date-desc": { date: -1, createdAt: -1 },
  "date-asc": { date: 1, createdAt: 1 },
  "amount-desc": { amountPaisa: -1, date: -1 },
  "amount-asc": { amountPaisa: 1, date: -1 },
} as const;

export async function listOwnedExpenses(firebaseUid: string, filters: ExpenseFilters): Promise<ExpenseDocument[]> {
  const query: Record<string, unknown> = { firebaseUid };
  if (filters.month) query.month = filters.month;
  if (filters.category) query.category = filters.category;
  if (filters.search) query.shop = { $regex: filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  return ExpenseModel.find(query).sort(sortMap[filters.sort]).lean<ExpenseDocument[]>().exec();
}

export async function findOwnedExpense(firebaseUid: string, id: string): Promise<ExpenseDocument | null> {
  return ExpenseModel.findOne({ _id: id, firebaseUid }).lean<ExpenseDocument>().exec();
}

export async function createOwnedExpense(firebaseUid: string, input: ExpenseWrite): Promise<ExpenseDocument> {
  const expense = await ExpenseModel.create({ firebaseUid, ...input, source: "manual" });
  return expense.toObject() as ExpenseDocument;
}

export async function updateOwnedExpense(firebaseUid: string, id: string, input: Partial<ExpenseWrite>): Promise<ExpenseDocument | null> {
  return ExpenseModel.findOneAndUpdate({ _id: id, firebaseUid }, { $set: input }, { new: true, runValidators: true })
    .lean<ExpenseDocument>().exec();
}

export async function deleteOwnedExpense(firebaseUid: string, id: string): Promise<boolean> {
  const result = await ExpenseModel.deleteOne({ _id: id, firebaseUid }).exec();
  return result.deletedCount === 1;
}
