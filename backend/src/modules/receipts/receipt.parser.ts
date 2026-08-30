import type { ExtractedField } from "./receipt.types.js";

const TOTAL_LABELS: Array<{ pattern: RegExp; confidence: number; priority: number }> = [
  { pattern: /grand\s*total/i, confidence: 0.95, priority: 100 },
  { pattern: /net\s*(?:total|payable|amount)/i, confidence: 0.92, priority: 95 },
  { pattern: /amount\s*(?:paid|payable)/i, confidence: 0.9, priority: 90 },
  { pattern: /(?:^|\s)total(?:\s|:|$)/i, confidence: 0.82, priority: 80 },
];

function normalizeAmount(value: string): string | null {
  const cleaned = value.replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  return `${Number(whole)}.${fraction.padEnd(2, "0")}`;
}

export function extractAmount(lines: string[]): ExtractedField {
  const candidates: Array<{ value: string; confidence: number; priority: number; line: number }> = [];
  lines.forEach((line, lineIndex) => {
    if (/sub\s*total/i.test(line)) return;
    const label = TOTAL_LABELS.find((entry) => entry.pattern.test(line));
    if (!label) return;
    const matches = [...line.matchAll(/(?:BDT|TK|TAKA|৳)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi)];
    const match = matches.at(-1)?.[1];
    const value = match ? normalizeAmount(match) : null;
    if (value) candidates.push({ value, confidence: label.confidence, priority: label.priority, line: lineIndex });
  });

  candidates.sort((a, b) => b.priority - a.priority || b.line - a.line);
  return candidates[0]
    ? { value: candidates[0].value, confidence: candidates[0].confidence }
    : { value: null, confidence: 0 };
}

function validIsoDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100) return null;
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? value : null;
}

export function extractDate(lines: string[]): ExtractedField {
  for (const line of lines) {
    const iso = line.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if (iso) {
      const value = validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
      if (value) return { value, confidence: /date/i.test(line) ? 0.94 : 0.86 };
    }
    const dayFirst = line.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
    if (dayFirst) {
      const value = validIsoDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
      if (value) return { value, confidence: /date/i.test(line) ? 0.92 : 0.82 };
    }
  }
  return { value: null, confidence: 0 };
}

export function extractShop(lines: string[]): ExtractedField {
  const ignored = /^(receipt|invoice|cash memo|tax invoice|customer copy|duplicate|date|time|phone|mobile|tel|vat|bin)\b/i;
  const candidate = lines.slice(0, 8).find((line) => {
    const trimmed = line.trim();
    return trimmed.length >= 2 && trimmed.length <= 120 && /[A-Za-z\u0980-\u09FF]/.test(trimmed) && !ignored.test(trimmed);
  });
  return candidate ? { value: candidate.trim(), confidence: 0.68 } : { value: null, confidence: 0 };
}

export function parseReceiptText(rawText: string) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return { amount: extractAmount(lines), date: extractDate(lines), shop: extractShop(lines) };
}
