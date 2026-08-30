import { ExpenseModel } from "../expenses/expense.model.js";

interface MonthlyAggregation {
  totals: Array<{ totalPaisa: number; count: number }>;
  categories: Array<{ _id: string; totalPaisa: number; count: number }>;
  largest: Array<{
    _id: { toString(): string };
    amountPaisa: number;
    date: string;
    shop: string;
    category: string;
    source: "manual" | "receipt";
  }>;
}

export async function aggregateMonth(firebaseUid: string, month: string): Promise<MonthlyAggregation> {
  const results = await ExpenseModel.aggregate<MonthlyAggregation>([
    { $match: { firebaseUid, month } },
    {
      $facet: {
        totals: [{ $group: { _id: null, totalPaisa: { $sum: "$amountPaisa" }, count: { $sum: 1 } } }],
        categories: [
          { $group: { _id: "$category", totalPaisa: { $sum: "$amountPaisa" }, count: { $sum: 1 } } },
          { $sort: { totalPaisa: -1, _id: 1 } },
        ],
        largest: [
          { $sort: { amountPaisa: -1, date: -1 } },
          { $limit: 5 },
          { $project: { amountPaisa: 1, date: 1, shop: 1, category: 1, source: 1 } },
        ],
      },
    },
  ]).exec();

  return results[0] ?? { totals: [], categories: [], largest: [] };
}

export async function aggregatePeriodTotal(
  firebaseUid: string,
  month: string,
  throughDay: number,
): Promise<number> {
  const cutoff = `${month}-${String(throughDay).padStart(2, "0")}`;
  const result = await ExpenseModel.aggregate<{ totalPaisa: number }>([
    { $match: { firebaseUid, month, date: { $lte: cutoff } } },
    { $group: { _id: null, totalPaisa: { $sum: "$amountPaisa" } } },
  ]).exec();
  return result[0]?.totalPaisa ?? 0;
}
