/**
 * Receipt capture — required item 1.
 *
 * OWNER: Claude.
 *
 * The brief: "Read the amount, date and shop name from the image, show what was
 * read so the user can check it, and let them correct any field before saving."
 *
 * The review step is a HARD GATE. The scan result populates a form; nothing
 * reaches the ledger until the user presses Save. Each field shows the model's
 * confidence and the literal text it read, with the photo beside it, so checking
 * is a glance rather than a squint. Low-confidence fields are visually flagged
 * and Save is blocked until the required three are valid.
 */
"use client";

import { useRef, useState } from "react";
import { CATEGORIES, EMPTY_EXTRACTION, type ReceiptExtraction } from "@/lib/ocr/types";
import { useLedgerStore } from "@/store/ledger-store";

type Draft = { amount: string; date: string; shop: string; category: string };

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CONF_STYLE: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-rose-50 text-rose-700 border-rose-200",
};

export function ReceiptCapture() {
  const addExpense = useLedgerStore((s) => s.addExpense);
  const fileInput = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const [draft, setDraft] = useState<Draft>({ amount: "", date: "", shop: "", category: "" });
  const [saved, setSaved] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  async function onFile(file: File) {
    setSaved(null);
    setTouched(false);
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    setExtraction(null);

    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/receipts/scan", { method: "POST", body });
      const data: ReceiptExtraction = await res.json();
      setExtraction(data);
      setDraft({
        amount: data.amount.value ?? "",
        date: data.date.value ?? "",
        shop: data.shop.value ?? "",
        category: data.category.value ?? "",
      });
    } catch {
      setExtraction({ ...EMPTY_EXTRACTION, error: "The scan request failed. Enter the details manually." });
    } finally {
      setScanning(false);
    }
  }

  const errors = {
    amount: !MONEY_RE.test(draft.amount) ? "Enter an amount like 1234.50" : null,
    date: !DATE_RE.test(draft.date) ? "Enter a date as YYYY-MM-DD" : null,
    shop: draft.shop.trim() === "" ? "Enter the shop name" : null,
    category: !(CATEGORIES as readonly string[]).includes(draft.category) ? "Pick a category" : null,
  };
  const valid = Object.values(errors).every((e) => e === null);

  function save() {
    setTouched(true);
    if (!valid) return;
    const [whole, frac = ""] = draft.amount.split(".");
    addExpense({
      date: draft.date,
      shop: draft.shop.trim(),
      category: draft.category,
      amount_bdt: `${whole}.${frac.padEnd(2, "0").slice(0, 2)}`,
    });
    setSaved(`Saved ৳${draft.amount} at ${draft.shop.trim()}.`);
    setExtraction(null);
    setPreview(null);
    setDraft({ amount: "", date: "", shop: "", category: "" });
    setTouched(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function field(
    key: keyof Draft,
    label: string,
    placeholder: string,
    read?: { confidence: string; raw: string | null },
  ) {
    const error = errors[key];
    const show = touched && error;
    return (
      <label className="block">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {label}
          {read && (
            <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${CONF_STYLE[read.confidence]}`}>
              {read.confidence === "low" ? "check this" : `${read.confidence} confidence`}
            </span>
          )}
        </span>
        {key === "category" ? (
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${show ? "border-rose-400" : "border-slate-300"}`}
          >
            <option value="">Select…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            placeholder={placeholder}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${show ? "border-rose-400" : "border-slate-300"}`}
          />
        )}
        {read?.raw && (
          <span className="mt-1 block text-[11px] text-slate-500">
            Read from receipt: <span className="font-mono">{read.raw}</span>
          </span>
        )}
        {show && <span className="mt-1 block text-[11px] text-rose-600">{error}</span>}
      </label>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Add an expense from a receipt</h2>
      <p className="mt-1 text-xs text-slate-500">
        Upload a photo of a bill. We read the amount, date and shop — then you check and correct it
        before anything is saved.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
        className="mt-3 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
      />

      {scanning && <p className="mt-3 text-xs text-slate-500">Reading the receipt…</p>}
      {saved && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{saved}</p>}

      {extraction && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {preview && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Uploaded receipt" className="w-full rounded-lg border border-slate-200" />
            </div>
          )}

          <div className="space-y-3">
            {extraction.error && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{extraction.error}</p>
            )}

            <p className="text-xs font-medium text-slate-700">
              Check what we read, correct anything that is wrong, then save.
            </p>

            {field("amount", "Amount (BDT)", "1234.50", extraction.amount)}
            {field("date", "Date", "2026-04-17", extraction.date)}
            {field("shop", "Shop", "Meena Bazar", extraction.shop)}
            {field("category", "Category", "", extraction.category)}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={save}
                className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                Save expense
              </button>
              <button
                onClick={() => {
                  setExtraction(null);
                  setPreview(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Discard
              </button>
              {touched && !valid && (
                <span className="text-[11px] text-rose-600">Fix the highlighted fields first.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
