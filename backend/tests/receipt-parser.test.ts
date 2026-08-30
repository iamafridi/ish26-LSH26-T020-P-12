import { describe, expect, it } from "vitest";

import { parseReceiptText } from "../src/modules/receipts/receipt.parser.js";

describe("receipt parser", () => {
  it("extracts merchant, date, and labelled grand total", () => {
    const parsed = parseReceiptText([
      "Shwapno",
      "Date: 17/04/2026",
      "Subtotal 2,300.00",
      "VAT 150.00",
      "Grand Total BDT 2,450.00",
    ].join("\n"));

    expect(parsed.shop.value).toBe("Shwapno");
    expect(parsed.date.value).toBe("2026-04-17");
    expect(parsed.amount.value).toBe("2450.00");
  });
});
