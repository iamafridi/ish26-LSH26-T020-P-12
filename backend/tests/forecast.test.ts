import { describe, expect, it } from "vitest";

import { calculateForecast } from "../src/modules/forecasts/forecast.service.js";

describe("daily-pace forecast", () => {
  it("projects current spending over the whole month", () => {
    const forecast = calculateForecast({
      selectedMonth: "2026-04",
      today: "2026-04-15",
      totalSpentPaisa: 15_000,
      salaryPaisa: 50_000,
    });

    expect(forecast).toMatchObject({
      status: "current",
      elapsedDays: 15,
      remainingDays: 15,
      dailyAveragePaisa: 1_000,
      expectedRemainingPaisa: 15_000,
      expectedMonthEndPaisa: 30_000,
      expectedBalancePaisa: 20_000,
    });
  });

  it("uses actual totals for a completed month", () => {
    const forecast = calculateForecast({
      selectedMonth: "2026-03",
      today: "2026-04-15",
      totalSpentPaisa: 12_345,
      salaryPaisa: 20_000,
    });
    expect(forecast.expectedRemainingPaisa).toBe(0);
    expect(forecast.expectedMonthEndPaisa).toBe(12_345);
  });
});
