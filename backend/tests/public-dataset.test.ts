import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { calculateForecast } from "../src/modules/forecasts/forecast.service.js";
import { generateInsights } from "../src/modules/insights/insight.service.js";
import { allocateContribution, calculateDps, completionMonths } from "../src/modules/savings-pockets/savings-pocket.projection.js";
import { moneyStringToPaisa } from "../src/shared/money/money.js";

interface PublicExpense { date: string; category: string; shop: string; amount_bdt: string }
interface PublicPocket { target_bdt: string; monthly_contribution_bdt: string }
interface PublicCase {
  case_id: string;
  today: string;
  months: { last: string; this: string };
  salary_bdt: string;
  expenses: PublicExpense[];
  pockets: PublicPocket[];
  dps_annual_rate_percent: string;
}

const datasetPath = process.env.P12_DATASET_PATH;
const datasetAvailable = Boolean(datasetPath && existsSync(datasetPath));
const cases: PublicCase[] = datasetAvailable
  ? (JSON.parse(readFileSync(datasetPath as string, "utf8")) as { cases: PublicCase[] }).cases
  : [];

describe.skipIf(!datasetAvailable)("P12 public dataset", () => {
  it("validates all 25 public cases against forecast, insight, pocket, and DPS invariants", () => {
    expect(cases).toHaveLength(25);
    for (const testCase of cases) {
      const currentExpenses = testCase.expenses.filter((expense) => expense.date.startsWith(testCase.months.this));
      const previousCutoff = `${testCase.months.last}-${testCase.today.slice(8, 10)}`;
      const previousExpenses = testCase.expenses.filter((expense) => expense.date.startsWith(testCase.months.last) && expense.date <= previousCutoff);
      const total = currentExpenses.reduce((sum, expense) => sum + moneyStringToPaisa(expense.amount_bdt), 0);
      const categoryMap = new Map<string, { totalPaisa: number; count: number }>();
      for (const expense of currentExpenses) {
        const current = categoryMap.get(expense.category) ?? { totalPaisa: 0, count: 0 };
        categoryMap.set(expense.category, { totalPaisa: current.totalPaisa + moneyStringToPaisa(expense.amount_bdt), count: current.count + 1 });
      }
      const previousMap = new Map<string, { totalPaisa: number; count: number }>();
      for (const expense of previousExpenses) {
        const current = previousMap.get(expense.category) ?? { totalPaisa: 0, count: 0 };
        previousMap.set(expense.category, { totalPaisa: current.totalPaisa + moneyStringToPaisa(expense.amount_bdt), count: current.count + 1 });
      }
      const categories = [...categoryMap].map(([category, value]) => ({ category, ...value })).sort((a, b) => b.totalPaisa - a.totalPaisa);
      const previousCategories = [...previousMap].map(([category, value]) => ({ category, ...value }));
      const largest = [...currentExpenses].sort((a, b) => moneyStringToPaisa(b.amount_bdt) - moneyStringToPaisa(a.amount_bdt))[0];
      const salary = moneyStringToPaisa(testCase.salary_bdt);
      const forecast = calculateForecast({ selectedMonth: testCase.months.this, today: testCase.today, totalSpentPaisa: total, salaryPaisa: salary });
      expect(forecast.expectedRemainingPaisa, testCase.case_id).toBeGreaterThanOrEqual(0);
      const insights = generateInsights({
        totalSpentPaisa: total,
        salaryPaisa: salary,
        categories,
        previousCategories,
        largestExpenses: largest ? [{ shop: largest.shop, category: largest.category, amountPaisa: moneyStringToPaisa(largest.amount_bdt) }] : [],
        forecast,
      });
      expect(insights.length, testCase.case_id).toBeGreaterThanOrEqual(3);

      const capacity = Math.max(forecast.expectedBalancePaisa ?? 0, 0);
      const planned = testCase.pockets.reduce((sum, pocket) => sum + moneyStringToPaisa(pocket.monthly_contribution_bdt), 0);
      const effective = testCase.pockets.map((pocket) => allocateContribution(moneyStringToPaisa(pocket.monthly_contribution_bdt), capacity, planned));
      expect(effective.reduce((sum, amount) => sum + amount, 0), testCase.case_id).toBeLessThanOrEqual(capacity);
      const rate = moneyStringToPaisa(testCase.dps_annual_rate_percent);
      testCase.pockets.forEach((pocket, index) => {
        const months = completionMonths(moneyStringToPaisa(pocket.target_bdt), effective[index] ?? 0);
        const dps = calculateDps(effective[index] ?? 0, rate, months);
        if (dps?.calculationAvailable) expect(dps.finalValuePaisa).toBe(dps.totalDepositsPaisa + dps.interestEarnedPaisa);
      });
    }
  });
});
