import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { addMonths, daysInMonth } from "../src/core/calendar";
import { monthsToReachPlain, runDps } from "../src/core/dps";
import { buildForecast } from "../src/core/forecast";
import { buildReport } from "../src/core/report";
import { DatasetSchema } from "../src/core/types";

describe("DPS reference schedule", () => {
  it("matches a hand-computed three-month schedule", () => {
    // Deposit 5,000 before interest at 10% annual:
    // M1: 5000.00 + 41.67 = 5041.67
    // M2: 10041.67 + 83.68 = 10125.35
    // M3: 15125.35 + 126.04 = 15251.39
    const result = runDps({
      monthlyDeposit: "5000.00",
      annualRatePercent: "10.00",
      months: 3,
    });

    expect(result.schedule.map((month) => month.interest_bdt)).toEqual([
      "41.67",
      "83.68",
      "126.04",
    ]);
    expect(result.schedule.map((month) => month.closing_balance_bdt)).toEqual([
      "5041.67",
      "10125.35",
      "15251.39",
    ]);
    expect(result.total_interest_bdt).toBe("251.39");
    expect(result.maturity_value_bdt).toBe("15251.39");
  });
});

describe("plain pocket timing", () => {
  it("does not add a month on an exact multiple", () => {
    expect(monthsToReachPlain("75000.00", "15000.00")).toBe(5);
  });

  it("rounds a non-multiple up to the next month", () => {
    expect(monthsToReachPlain("75000.01", "15000.00")).toBe(6);
  });
});

describe("timezone-free calendar boundaries", () => {
  it("handles February in leap and ordinary years", () => {
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2100-02")).toBe(28);
  });

  it("adds months across a year boundary", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });
});

describe("forecast day boundaries", () => {
  const expense = {
    id: "E-1",
    date: "2026-04-01",
    category: "Food",
    shop: "Shop",
    amount_bdt: "100.00",
  };

  it("counts the first day as elapsed", () => {
    const result = buildForecast({
      expenses: [expense],
      today: "2026-04-01",
      thisMonth: "2026-04",
      salaryBdt: "50000.00",
      pockets: [],
    });

    expect(result.days_elapsed).toBe(1);
    expect(result.days_remaining).toBe(29);
    expect(result.projected_remaining_bdt).toBe("2900.00");
  });

  it("projects nothing after the last day", () => {
    const result = buildForecast({
      expenses: [expense],
      today: "2026-04-30",
      thisMonth: "2026-04",
      salaryBdt: "50000.00",
      pockets: [],
    });

    expect(result.days_elapsed).toBe(30);
    expect(result.days_remaining).toBe(0);
    expect(result.projected_remaining_bdt).toBe("0.00");
    expect(result.projected_month_total_bdt).toBe("100.00");
  });

  it("handles a zero-expense month without division artifacts", () => {
    const result = buildForecast({
      expenses: [],
      today: "2026-04-17",
      thisMonth: "2026-04",
      salaryBdt: "50000.00",
      pockets: [],
    });

    expect(result.daily_burn_bdt).toBe("0.00");
    expect(result.projected_remaining_bdt).toBe("0.00");
    expect(result.projected_month_total_bdt).toBe("0.00");
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
  });
});

describe("official insight coverage", () => {
  it("emits at least three insights for every public case", () => {
    const datasetPath = path.join(process.cwd(), "src/data/p12-public.json");
    const dataset = DatasetSchema.parse(JSON.parse(fs.readFileSync(datasetPath, "utf8")));

    for (const ledgerCase of dataset.cases) {
      expect(buildReport(ledgerCase).insights.length, ledgerCase.case_id).toBeGreaterThanOrEqual(3);
    }
  });
});
