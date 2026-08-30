import { daysInMonth } from "../../shared/dates/month.js";
import type { ForecastInput, ForecastResult } from "./forecast.types.js";

export function divideHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error("Forecast division requires safe integers and a positive denominator.");
  }
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export function calculateForecast(input: ForecastInput): ForecastResult {
  const currentMonth = input.today.slice(0, 7);
  if (input.selectedMonth > currentMonth) {
    return {
      status: "future", method: "daily-pace", elapsedDays: null, remainingDays: null,
      dailyAveragePaisa: null, expectedRemainingPaisa: null, expectedMonthEndPaisa: null,
      expectedBalancePaisa: null,
    };
  }

  const monthDays = daysInMonth(input.selectedMonth);
  if (input.selectedMonth < currentMonth) {
    return {
      status: "complete", method: "daily-pace", elapsedDays: monthDays, remainingDays: 0,
      dailyAveragePaisa: divideHalfUp(input.totalSpentPaisa, monthDays),
      expectedRemainingPaisa: 0,
      expectedMonthEndPaisa: input.totalSpentPaisa,
      expectedBalancePaisa: input.salaryPaisa === null ? null : input.salaryPaisa - input.totalSpentPaisa,
    };
  }

  const elapsedDays = Number(input.today.slice(8, 10));
  const remainingDays = monthDays - elapsedDays;
  const dailyAveragePaisa = divideHalfUp(input.totalSpentPaisa, elapsedDays);
  const expectedMonthEndPaisa = divideHalfUp(input.totalSpentPaisa * monthDays, elapsedDays);
  const expectedRemainingPaisa = Math.max(expectedMonthEndPaisa - input.totalSpentPaisa, 0);
  return {
    status: "current", method: "daily-pace", elapsedDays, remainingDays, dailyAveragePaisa,
    expectedRemainingPaisa, expectedMonthEndPaisa,
    expectedBalancePaisa: input.salaryPaisa === null ? null : input.salaryPaisa - expectedMonthEndPaisa,
  };
}
