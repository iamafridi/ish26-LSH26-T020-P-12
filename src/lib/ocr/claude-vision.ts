/**
 * Receipt reading via Claude vision.
 *
 * OWNER: Claude. This is the ONLY place in the app that calls a language model.
 * Every number on the dashboard is computed in src/core/ — see
 * docs/ARCHITECTURE.md §3 for why the model is kept away from arithmetic.
 *
 * Structured outputs are used so the response is schema-validated by the API
 * rather than parsed out of prose. We still re-validate with zod on arrival:
 * a receipt photographed at an angle can yield a plausible-looking date like
 * "2026-13-45", and that must fail here rather than reach the ledger.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CATEGORIES,
  EMPTY_EXTRACTION,
  type OcrPort,
  type ReceiptExtraction,
} from "./types";

const MODEL = "claude-opus-5";

const ResponseSchema = z.object({
  amount: z.string().nullable(),
  amount_raw: z.string().nullable(),
  amount_confidence: z.enum(["high", "medium", "low"]),
  date: z.string().nullable(),
  date_raw: z.string().nullable(),
  date_confidence: z.enum(["high", "medium", "low"]),
  shop: z.string().nullable(),
  shop_raw: z.string().nullable(),
  shop_confidence: z.enum(["high", "medium", "low"]),
  category: z.string().nullable(),
  category_confidence: z.enum(["high", "medium", "low"]),
  unreadable_reason: z.string().nullable(),
});

const SYSTEM = `You read Bangladeshi retail receipts and bills from photographs.

Return only what you can actually see. This is the rule that matters most: if a
field is blurred, cropped, or absent, set it to null with confidence "low" and
put whatever partial text you can see in the *_raw field. A null the user fills
in is fine. A confident guess the user waves through is a corrupted ledger.

amount   The GRAND TOTAL actually paid — not a subtotal, not a single line item,
         not the VAT line, not the cash tendered. If a discount or VAT is applied,
         take the final payable figure. Format as a plain decimal string with
         exactly two decimal places and no currency symbol, no thousands
         separators: "1234.50". Bangladeshi receipts often print Taka as Tk, TK,
         BDT or the sign; strip it.
date     The transaction date, as "YYYY-MM-DD". Bangladeshi receipts are usually
         DD/MM/YYYY, so 05/03/2026 is 2026-03-05, NOT 2026-05-03. If the year is
         two digits, assume 20xx. If no date is visible, null.
shop     The merchant's trading name as printed at the top — not the branch
         address, not the cashier, not the slogan.
category Exactly one of: ${CATEGORIES.join(", ")}. Infer from the merchant and the
         items. There is no "Other" — pick the closest of these ten and lower the
         confidence to "low" if the fit is poor. Guidance for the ambiguous ones:
         restaurants, cafes and takeaway are Food; a supermarket or bazar shop is
         Groceries; phone top-ups, SIM and internet bills are Mobile; electricity,
         gas, water and municipal bills are Utilities; pharmacy, clinic, doctor
         and diagnostics are Health.

*_raw fields hold the literal characters you read for that field, so the user can
check your reading against the image. Set unreadable_reason only when the image
is not a receipt at all or is too degraded to read anything.`;

const OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    amount: { type: ["string", "null"] },
    amount_raw: { type: ["string", "null"] },
    amount_confidence: { type: "string", enum: ["high", "medium", "low"] },
    date: { type: ["string", "null"] },
    date_raw: { type: ["string", "null"] },
    date_confidence: { type: "string", enum: ["high", "medium", "low"] },
    shop: { type: ["string", "null"] },
    shop_raw: { type: ["string", "null"] },
    shop_confidence: { type: "string", enum: ["high", "medium", "low"] },
    category: { type: ["string", "null"], enum: [...CATEGORIES, null] },
    category_confidence: { type: "string", enum: ["high", "medium", "low"] },
    unreadable_reason: { type: ["string", "null"] },
  },
  required: [
    "amount", "amount_raw", "amount_confidence",
    "date", "date_raw", "date_confidence",
    "shop", "shop_raw", "shop_confidence",
    "category", "category_confidence",
    "unreadable_reason",
  ],
  additionalProperties: false,
};

/** Reject a value the model formatted plausibly but wrongly. */
const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string | null): string | null {
  if (!value || !DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Reject a day that does not exist in that month (e.g. 2026-02-30).
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= lengths[m - 1] ? value : null;
}

function normaliseMoney(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[,\s৳]/g, "").replace(/^(Tk|TK|BDT)/i, "");
  if (!MONEY_RE.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return `${whole}.${frac.padEnd(2, "0").slice(0, 2)}`;
}

export class ClaudeVisionOcr implements OcrPort {
  private client: Anthropic;

  constructor(client?: Anthropic) {
    // Zero-arg construction resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or
    // an `ant auth login` profile — see the SDK's credential chain.
    this.client = client ?? new Anthropic();
  }

  async extract(image: { base64: string; mediaType: string }): Promise<ReceiptExtraction> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType as "image/jpeg",
                data: image.base64,
              },
            },
            { type: "text", text: "Read this receipt." },
          ],
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { ...EMPTY_EXTRACTION, error: "The model returned no readable response." };
    }

    const parsed = ResponseSchema.safeParse(JSON.parse(text.text));
    if (!parsed.success) {
      return { ...EMPTY_EXTRACTION, error: "The model's response did not match the expected shape." };
    }

    const r = parsed.data;
    const amount = normaliseMoney(r.amount);
    const date = validDate(r.date);

    return {
      // A value we had to reject is downgraded to low confidence, not silently
      // dropped — the raw text still shows the user what we saw.
      amount: {
        value: amount,
        confidence: amount ? r.amount_confidence : "low",
        raw: r.amount_raw,
      },
      date: {
        value: date,
        confidence: date ? r.date_confidence : "low",
        raw: r.date_raw,
      },
      shop: {
        value: r.shop?.trim() || null,
        confidence: r.shop_confidence,
        raw: r.shop_raw,
      },
      category: {
        value: (CATEGORIES as readonly string[]).includes(r.category ?? "") ? r.category : null,
        confidence: r.category_confidence,
        raw: null,
      },
      error: r.unreadable_reason,
    };
  }
}
