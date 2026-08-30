import type { ForecastResult } from "../forecasts/forecast.types.js";

export interface InsightCategory {
  category: string;
  totalPaisa: number;
  count: number;
}

export interface InsightExpense {
  shop: string;
  category: string;
  amountPaisa: number;
}

export interface InsightInput {
  totalSpentPaisa: number;
  salaryPaisa: number | null;
  categories: InsightCategory[];
  previousCategories: InsightCategory[];
  largestExpenses: InsightExpense[];
  forecast: ForecastResult;
}

export interface WrittenInsight {
  id: string;
  tone: "warning" | "positive" | "neutral";
  title: string;
  text: string;
}
