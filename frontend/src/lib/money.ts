/**
 * Money on the client is PRESENTATION ONLY.
 *
 * Every amount reaches this app as a canonical 2dp string computed by the API's
 * decimal engine. Nothing here adds, multiplies or rounds a money value, and
 * nothing here ever needs to: if the interface wants a figure, the figure is
 * computed server-side and sent.
 *
 * The one exception is `toChartWidth`, which produces a float for pixel
 * geometry. Its output may set a width or an arc angle and nothing else — never
 * a label, never a tooltip, never an aria-label, never a value posted back.
 */

export type Money = string;

/** Canonical form: an optional minus, digits, a point, exactly two digits. */
export function isCanonical(value: string): boolean {
  return /^-?\d+\.\d{2}$/.test(value);
}

export function isNegative(value: Money): boolean {
  return value.startsWith("-") && value !== "-0.00";
}

export function isZero(value: Money): boolean {
  return value === "0.00" || value === "-0.00";
}

export interface MoneyParts {
  sign: "" | "-";
  taka: string;
  paisa: string;
}

/**
 * Split for the paisa typography: sign, thousands-grouped taka, two paisa
 * digits. String surgery only — the digits are never parsed into a number.
 */
export function splitMoney(value: Money): MoneyParts {
  const negative = isNegative(value);
  const unsigned = negative ? value.slice(1) : value;
  const [whole = "0", fraction = "00"] = unsigned.split(".");
  return {
    sign: negative ? "-" : "",
    taka: whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    paisa: fraction.padEnd(2, "0").slice(0, 2),
  };
}

/** Plain text form, for aria-labels and any non-JSX context. */
export function formatMoney(value: Money, options?: { symbol?: boolean }): string {
  const { sign, taka, paisa } = splitMoney(value);
  const symbol = options?.symbol === false ? "" : "৳";
  return `${sign}${symbol}${taka}.${paisa}`;
}

/** Absolute value, as a string. Sign stripped, digits untouched. */
export function absolute(value: Money): Money {
  return isNegative(value) ? value.slice(1) : value;
}

/**
 * FOR GEOMETRY ONLY. Pixel widths and arc angles.
 * Never a label, never a calculation, never storage.
 */
export function toChartWidth(value: Money): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalise what someone typed into canonical form, or explain why it will not
 * do. Used on the receipt review form and the expense form. Bengali numerals are
 * accepted because a phone keyboard set to Bangla produces them and rejecting
 * them would look like the app was broken.
 */
const BENGALI = "০১২৩৪৫৬৭৮৯";

export function toCanonical(raw: string): { ok: true; value: Money } | { ok: false; reason: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "Enter an amount." };

  const latin = trimmed.replace(/[০-৯]/g, (digit) => String(BENGALI.indexOf(digit)));
  const cleaned = latin.replace(/[৳,\s]/g, "");
  if (!cleaned) return { ok: false, reason: "Enter an amount." };

  const parts = cleaned.split(".");
  if (parts.length > 2) return { ok: false, reason: "That has more than one decimal point." };

  const [whole = "", fraction = ""] = parts;
  if (!/^\d+$/.test(whole)) return { ok: false, reason: "Amounts can only contain digits." };
  if (fraction && !/^\d+$/.test(fraction)) {
    return { ok: false, reason: "Amounts can only contain digits." };
  }
  if (fraction.length > 2) return { ok: false, reason: "Amounts stop at two decimal places." };

  const normalisedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  return { ok: true, value: `${normalisedWhole}.${fraction.padEnd(2, "0")}` };
}
