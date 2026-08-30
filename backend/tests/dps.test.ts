import { describe, expect, it } from "vitest";

import { allocateContribution, calculateDps, completionMonths } from "../src/modules/savings-pockets/savings-pocket.projection.js";

describe("savings projection", () => {
  it("allocates one forecast capacity proportionally across pockets", () => {
    expect(allocateContribution(12_000, 18_000, 41_000)).toBe(5_268);
    expect(allocateContribution(9_000, 18_000, 41_000)).toBe(3_951);
    expect(allocateContribution(20_000, 18_000, 41_000)).toBe(8_780);
  });

  it("rounds the required number of contribution months upward", () => {
    expect(completionMonths(145_000, 10_000)).toBe(15);
    expect(completionMonths(0, 10_000)).toBe(0);
    expect(completionMonths(10_000, 0)).toBeNull();
  });

  it("adds each deposit before monthly half-up DPS interest", () => {
    const projection = calculateDps(10_000, 1_200, 2);
    expect(projection).toMatchObject({
      totalDepositsPaisa: 20_000,
      interestEarnedPaisa: 301,
      finalValuePaisa: 20_301,
      calculationAvailable: true,
    });
  });
});
