import { divideHalfUp } from "../forecasts/forecast.service.js";
import type { InsightInput, WrittenInsight } from "./insight.types.js";

function money(paisa: number): string {
  const absolute = Math.abs(paisa);
  const whole = Math.floor(absolute / 100).toLocaleString("en-BD");
  return `BDT ${paisa < 0 ? "-" : ""}${whole}.${String(absolute % 100).padStart(2, "0")}`;
}

export function generateInsights(input: InsightInput): WrittenInsight[] {
  if (input.totalSpentPaisa === 0 || input.categories.length === 0) return [];
  const candidates: WrittenInsight[] = [];

  if (input.forecast.expectedBalancePaisa !== null && input.forecast.expectedMonthEndPaisa !== null) {
    if (input.forecast.expectedBalancePaisa < 0) {
      candidates.push({
        id: "forecast-shortfall", tone: "warning", title: "Month-end shortfall expected",
        text: `At the current daily pace, spending may reach ${money(input.forecast.expectedMonthEndPaisa)}, exceeding salary by ${money(Math.abs(input.forecast.expectedBalancePaisa))}.`,
      });
    } else {
      candidates.push({
        id: "forecast-surplus", tone: "positive", title: "Money may remain at month end",
        text: `At the current daily pace, spending may reach ${money(input.forecast.expectedMonthEndPaisa)}, leaving ${money(input.forecast.expectedBalancePaisa)} from salary.`,
      });
    }
  }

  const largestCategory = input.categories[0];
  if (largestCategory) {
    const share = Math.round((largestCategory.totalPaisa * 10_000) / input.totalSpentPaisa) / 100;
    candidates.push({
      id: "largest-category", tone: "neutral", title: `${largestCategory.category} leads spending`,
      text: `${largestCategory.category} totals ${money(largestCategory.totalPaisa)}, representing ${share.toFixed(2)}% of recorded spending.`,
    });
  }

  const previousByCategory = new Map(input.previousCategories.map((item) => [item.category, item.totalPaisa]));
  const changes = input.categories.map((item) => ({
    ...item,
    changePaisa: item.totalPaisa - (previousByCategory.get(item.category) ?? 0),
  })).sort((a, b) => Math.abs(b.changePaisa) - Math.abs(a.changePaisa));
  const largestChange = changes[0];
  if (largestChange && largestChange.changePaisa !== 0) {
    candidates.push({
      id: "category-change",
      tone: largestChange.changePaisa > 0 ? "warning" : "positive",
      title: `${largestChange.category} ${largestChange.changePaisa > 0 ? "increased" : "decreased"}`,
      text: `${largestChange.category} is ${money(Math.abs(largestChange.changePaisa))} ${largestChange.changePaisa > 0 ? "higher" : "lower"} than the comparable previous-month period, at ${money(largestChange.totalPaisa)} now.`,
    });
  }

  const largestExpense = input.largestExpenses[0];
  if (largestExpense) {
    candidates.push({
      id: "largest-expense", tone: "neutral", title: "Largest individual expense",
      text: `${largestExpense.shop} is the largest expense at ${money(largestExpense.amountPaisa)} in ${largestExpense.category}.`,
    });
  }

  if (largestCategory && input.forecast.status === "current" && input.forecast.elapsedDays && input.forecast.remainingDays !== null) {
    const totalDays = input.forecast.elapsedDays + input.forecast.remainingDays;
    const projected = divideHalfUp(largestCategory.totalPaisa * totalDays, input.forecast.elapsedDays);
    candidates.push({
      id: "category-forecast", tone: "neutral", title: `${largestCategory.category} pace`,
      text: `${largestCategory.category} is ${money(largestCategory.totalPaisa)} so far and may reach about ${money(projected)} by month end at the same pace.`,
    });
  }

  if (largestCategory) {
    candidates.push({
      id: "category-frequency", tone: "neutral", title: `${largestCategory.category} activity`,
      text: `${largestCategory.count} ${largestCategory.category} ${largestCategory.count === 1 ? "expense totals" : "expenses total"} ${money(largestCategory.totalPaisa)} in this period.`,
    });
  }

  return candidates.slice(0, Math.max(3, Math.min(candidates.length, 5)));
}
