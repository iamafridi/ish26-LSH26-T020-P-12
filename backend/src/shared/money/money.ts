import { AppError } from "../errors/app-error.js";

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/;

export function moneyStringToPaisa(value: string): number {
  const normalized = value.trim();
  if (!MONEY_PATTERN.test(normalized)) {
    throw new AppError(400, "VALIDATION_ERROR", "Enter a valid amount with up to two decimal places.");
  }

  const [taka = "0", fraction = ""] = normalized.split(".");
  const paisa = Number(taka) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paisa)) {
    throw new AppError(400, "VALIDATION_ERROR", "The amount is too large.");
  }
  return paisa;
}

export function paisaToMoneyString(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Money must be stored as integer paisa.");
  }
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}
