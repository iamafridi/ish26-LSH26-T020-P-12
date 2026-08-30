export interface ForecastInput {
  selectedMonth: string;
  today: string;
  totalSpentPaisa: number;
  salaryPaisa: number | null;
}

export interface ForecastResult {
  status: "current" | "complete" | "future";
  method: "daily-pace";
  elapsedDays: number | null;
  remainingDays: number | null;
  dailyAveragePaisa: number | null;
  expectedRemainingPaisa: number | null;
  expectedMonthEndPaisa: number | null;
  expectedBalancePaisa: number | null;
}
