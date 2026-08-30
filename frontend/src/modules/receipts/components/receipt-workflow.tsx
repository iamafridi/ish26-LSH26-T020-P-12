"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { currentDhakaDate } from "@/lib/date";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { expenseFormSchema } from "@/modules/expenses/schemas/expense.schema";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseInput } from "@/modules/expenses/types/expense.types";
import { confirmReceiptExpense, extractReceipt } from "../api/receipt.api";
import type { ReceiptExtraction } from "../types/receipt.types";

const emptyDraft = (): ExpenseInput => ({ amount: "", date: currentDhakaDate(), shop: "", category: "Groceries", note: "" });

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.6) return "Check this field";
  return "Needs your input";
}

export function ReceiptWorkflow() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const [draft, setDraft] = useState<ExpenseInput>(emptyDraft);
  const [reviewing, setReviewing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseFile(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
    setExtraction(null);
    setReviewing(false);
    setError(null);
  }

  async function handleExtract() {
    if (!user || !file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt images must be 5 MB or smaller.");
      return;
    }
    setExtracting(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await extractReceipt(file, token);
      const result = response.data.extraction;
      setExtraction(result);
      setDraft({
        amount: result.amount.value ?? "",
        date: result.date.value ?? currentDhakaDate(),
        shop: result.shop.value ?? "",
        category: "Groceries",
        note: "Added from a receipt image",
      });
      setReviewing(true);
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Unable to read this receipt.");
    } finally {
      setExtracting(false);
    }
  }

  function startManualReview() {
    setExtraction(null);
    setDraft(emptyDraft());
    setReviewing(true);
    setError(null);
  }

  function updateField<TKey extends keyof ExpenseInput>(key: TKey, value: ExpenseInput[TKey]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const result = expenseFormSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the receipt details.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      await confirmReceiptExpense(result.data, token);
      router.push("/expenses");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this expense.");
    } finally {
      setSaving(false);
    }
  }

  const corrected = extraction ? {
    amount: draft.amount !== (extraction.amount.value ?? ""),
    date: draft.date !== (extraction.date.value ?? currentDhakaDate()),
    shop: draft.shop !== (extraction.shop.value ?? ""),
  } : null;

  return (
    <div className="receipt-page">
      <div><p className="eyebrow">RECEIPT CAPTURE</p><h1>Turn a receipt into an expense</h1><p>Nothing is saved until you review and confirm every field.</p></div>
      <div className="receipt-grid">
        <section className="upload-panel">
          <div className="receipt-preview">
            {previewUrl ? <Image src={previewUrl} alt="Selected receipt" fill unoptimized className="receipt-image" /> : <div><strong>Add a receipt photo</strong><span>JPEG, PNG, or WebP · up to 5 MB</span></div>}
          </div>
          <label className="file-button">{file ? "Replace image" : "Choose or take photo"}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></label>
          {file && <><span className="file-name">{file.name}</span><button type="button" onClick={() => void handleExtract()} disabled={extracting}>{extracting ? "Reading receipt…" : "Read receipt"}</button></>}
          <button type="button" className="text-button" onClick={startManualReview}>Enter details manually</button>
        </section>

        <section className="review-panel">
          {!reviewing ? <div className="review-empty"><strong>Review appears here</strong><p>After reading the image, check the amount, date, and shop before saving.</p></div> : (
            <form className="form-stack" onSubmit={handleSave}>
              <div><p className="eyebrow">CHECK WHAT WAS READ</p><h2>Review expense details</h2></div>
              <label>Amount (BDT)<input type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => updateField("amount", event.target.value)} required />{extraction && <small className={extraction.amount.confidence < 0.85 ? "confidence warning" : "confidence"}>{corrected?.amount ? "Corrected by you" : confidenceLabel(extraction.amount.confidence)}</small>}</label>
              <label>Date<input type="date" max={currentDhakaDate()} value={draft.date} onChange={(event) => updateField("date", event.target.value)} required />{extraction && <small className={extraction.date.confidence < 0.85 ? "confidence warning" : "confidence"}>{corrected?.date ? "Corrected by you" : confidenceLabel(extraction.date.confidence)}</small>}</label>
              <label>Shop or merchant<input value={draft.shop} onChange={(event) => updateField("shop", event.target.value)} maxLength={120} required />{extraction && <small className={extraction.shop.confidence < 0.85 ? "confidence warning" : "confidence"}>{corrected?.shop ? "Corrected by you" : confidenceLabel(extraction.shop.confidence)}</small>}</label>
              <label>Category<select value={draft.category} onChange={(event) => updateField("category", event.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Note (optional)<textarea rows={3} maxLength={500} value={draft.note} onChange={(event) => updateField("note", event.target.value)} /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" disabled={saving}>{saving ? "Saving expense…" : "Confirm and save expense"}</button>
            </form>
          )}
          {error && !reviewing && <div><p className="form-error" role="alert">{error}</p><button type="button" className="text-button" onClick={startManualReview}>Continue manually</button></div>}
        </section>
      </div>
    </div>
  );
}
