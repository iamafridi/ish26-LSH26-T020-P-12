import { describe, expect, it } from "vitest";

import { calculateForecast } from "../src/modules/forecasts/forecast.service.js";
import { generateInsights } from "../src/modules/insights/insight.service.js";

describe("written insights", () => {
  it("returns at least three insights containing actual categories and amounts", () => {
    const forecast = calculateForecast({ selectedMonth: "2026-04", today: "2026-04-15", totalSpentPaisa: 2_000_000, salaryPaisa: 3_000_000 });
    const insights = generateInsights({
      totalSpentPaisa: 2_000_000,
      salaryPaisa: 3_000_000,
      categories: [{ category: "Rent", totalPaisa: 1_600_000, count: 1 }, { category: "Food", totalPaisa: 400_000, count: 4 }],
      previousCategories: [{ category: "Rent", totalPaisa: 1_600_000, count: 1 }, { category: "Food", totalPaisa: 250_000, count: 3 }],
      largestExpenses: [{ shop: "Landlord", category: "Rent", amountPaisa: 1_600_000 }],
      forecast,
    });

    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(insights.some((item) => item.text.includes("Rent") && item.text.includes("BDT"))).toBe(true);
    expect(insights.every((item) => /BDT|%/.test(item.text))).toBe(true);
  });
});
