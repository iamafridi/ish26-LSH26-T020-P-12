import { describe, expect, it } from "vitest";

import { moneyStringToPaisa, paisaToMoneyString } from "../src/shared/money/money.js";

describe("money conversion", () => {
  it("round-trips taka and paisa without floating-point arithmetic", () => {
    expect(moneyStringToPaisa("856.50")).toBe(85_650);
    expect(moneyStringToPaisa("10000")).toBe(1_000_000);
    expect(paisaToMoneyString(85_650)).toBe("856.50");
    expect(paisaToMoneyString(-275)).toBe("-2.75");
  });

  it("rejects values with more than two decimal places", () => {
    expect(() => moneyStringToPaisa("10.999")).toThrow("valid amount");
  });
});
