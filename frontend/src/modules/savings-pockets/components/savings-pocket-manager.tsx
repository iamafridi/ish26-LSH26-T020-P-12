"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { formatBDT } from "@/lib/format-money";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { createPocket, deletePocket, fetchPockets, updatePocket } from "../api/savings-pocket.api";
import { pocketFormSchema } from "../schemas/savings-pocket.schema";
import type { PocketInput, PocketsResponse, SavingsPocket } from "../types/savings-pocket.types";

const emptyForm = (): PocketInput => ({
  name: "", itemDetails: "", targetAmount: "", currentSavedAmount: "0.00",
  monthlyContribution: "", annualRatePercent: "8.00",
});

function displayMonth(month: string | null): string {
  if (!month) return "Unavailable";
  return new Intl.DateTimeFormat("en-BD", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));
}

function projectionMessage(pocket: SavingsPocket): string {
  if (pocket.projection.status === "complete") return "Target completed";
  if (pocket.projection.status === "salary-required") return "Set this month's salary to calculate a date";
  if (pocket.projection.status === "not-affordable") return "Not currently achievable at this spending pace";
  return `Expected by ${displayMonth(pocket.projection.completionMonth)}`;
}

export function SavingsPocketManager() {
  const { user } = useAuth();
  const [data, setData] = useState<PocketsResponse["data"] | null>(null);
  const [form, setForm] = useState<PocketInput>(emptyForm);
  const [editing, setEditing] = useState<SavingsPocket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetchPockets(token);
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load savings pockets.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateField<TKey extends keyof PocketInput>(key: TKey, value: PocketInput[TKey]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  }

  function openEdit(pocket: SavingsPocket) {
    setEditing(pocket);
    setForm({
      name: pocket.name, itemDetails: pocket.itemDetails, targetAmount: pocket.targetAmount,
      currentSavedAmount: pocket.currentSavedAmount, monthlyContribution: pocket.monthlyContribution,
      annualRatePercent: pocket.annualRatePercent,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const result = pocketFormSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the pocket details.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      if (editing) await updatePocket(editing.id, result.data, token);
      else await createPocket(result.data, token);
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this pocket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pocket: SavingsPocket) {
    if (!user || !window.confirm(`Delete the ${pocket.name} savings pocket?`)) return;
    try {
      const token = await user.getIdToken();
      await deletePocket(pocket.id, token);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this pocket.");
    }
  }

  return (
    <div className="pockets-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">SAVINGS POCKETS</p><h1>Goals grounded in your forecast</h1><p>Completion dates share the money your current spending pace is expected to leave.</p></div>
        <button type="button" onClick={openCreate}>Create pocket</button>
      </div>

      {error && !showForm && <p className="form-error" role="alert">{error}</p>}
      {data && (
        <section className="pocket-capacity">
          <div><span>Forecast savings capacity</span><strong>{data.forecastCapacity === null ? "Set salary" : formatBDT(data.forecastCapacity)}</strong></div>
          <div><span>Planned contributions</span><strong>{formatBDT(data.totalPlannedContribution)}</strong></div>
          <div><span>Plan affordability</span><strong>{data.affordabilityPercentage === null ? "Unavailable" : `${data.affordabilityPercentage.toFixed(2)}%`}</strong></div>
          <p>{data.forecastCapacity === null ? "Set this month's salary to connect pocket dates to your forecast." : data.affordabilityPercentage !== null && data.affordabilityPercentage < 100 ? "Planned contributions exceed the forecast surplus, so each pocket is reduced proportionally." : "Your forecast can support the planned monthly contributions."}</p>
        </section>
      )}

      {loading ? <div className="empty-card">Loading savings pockets…</div> : !data || data.pockets.length === 0 ? (
        <div className="empty-card"><strong>No savings pockets yet</strong><p>Create a pocket for a laptop, trip, bike, wedding, or another specific item.</p></div>
      ) : (
        <div className="pocket-grid">
          {data.pockets.map((pocket) => (
            <article className="pocket-card" key={pocket.id}>
              <div className="pocket-card-heading"><div><span>{pocket.name}</span><h2>{pocket.itemDetails}</h2></div><div className="row-actions"><button type="button" className="text-button" onClick={() => openEdit(pocket)}>Edit</button><button type="button" className="danger-button" onClick={() => void handleDelete(pocket)}>Delete</button></div></div>
              <div className="progress-label"><span>{formatBDT(pocket.currentSavedAmount)} saved</span><strong>{pocket.projection.progressPercentage.toFixed(2)}%</strong><span>Target {formatBDT(pocket.targetAmount)}</span></div>
              <div className="pocket-progress" role="progressbar" aria-label={`${pocket.name} savings progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pocket.projection.progressPercentage}><span style={{ width: `${pocket.projection.progressPercentage}%` }} /></div>
              <div className={`completion-callout ${pocket.projection.status}`}><span>Forecast completion</span><strong>{projectionMessage(pocket)}</strong>{pocket.projection.completionMonths !== null && pocket.projection.status === "active" && <small>{pocket.projection.completionMonths} months at {pocket.projection.effectiveMonthlyContribution ? formatBDT(pocket.projection.effectiveMonthlyContribution) : "BDT 0.00"} per month</small>}</div>
              <div className="contribution-comparison"><div><span>Your planned contribution</span><strong>{formatBDT(pocket.monthlyContribution)}</strong></div><div><span>Forecast-adjusted contribution</span><strong>{pocket.projection.effectiveMonthlyContribution === null ? "Unavailable" : formatBDT(pocket.projection.effectiveMonthlyContribution)}</strong></div></div>
              <section className="dps-panel">
                <div className="card-heading"><div><p className="eyebrow">DPS PROJECTION</p><h3>{pocket.annualRatePercent}% annual rate</h3></div></div>
                {!pocket.projection.dps ? <p>A DPS return needs an affordable monthly contribution.</p> : !pocket.projection.dps.calculationAvailable ? <p>The projected duration is beyond the supported DPS calculation range.</p> : (
                  <div className="dps-values"><div><span>Total deposits</span><strong>{formatBDT(pocket.projection.dps.totalDeposits)}</strong></div><div><span>Interest earned</span><strong>{formatBDT(pocket.projection.dps.interestEarned)}</strong></div><div><span>Projected return</span><strong>{formatBDT(pocket.projection.dps.finalValue)}</strong></div></div>
                )}
                <small>Each month adds the deposit first, then applies monthly interest rounded half-up to the paisa. Actual bank tax, fees, and terms may differ.</small>
              </section>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="pocket-form-title">
            <div className="section-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} POCKET</p><h2 id="pocket-form-title">{editing ? "Update savings goal" : "Create savings goal"}</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setShowForm(false)}>×</button></div>
            <form className="form-stack" onSubmit={handleSubmit}>
              <label>Pocket name<input value={form.name} onChange={(event) => updateField("name", event.target.value)} maxLength={80} placeholder="Laptop" required /></label>
              <label>Item details<textarea value={form.itemDetails} onChange={(event) => updateField("itemDetails", event.target.value)} maxLength={300} rows={2} placeholder="MacBook Air" required /></label>
              <div className="form-columns"><label>Target amount<input type="number" min="0.01" step="0.01" value={form.targetAmount} onChange={(event) => updateField("targetAmount", event.target.value)} required /></label><label>Already saved<input type="number" min="0" step="0.01" value={form.currentSavedAmount} onChange={(event) => updateField("currentSavedAmount", event.target.value)} required /></label></div>
              <div className="form-columns"><label>Monthly contribution<input type="number" min="0.01" step="0.01" value={form.monthlyContribution} onChange={(event) => updateField("monthlyContribution", event.target.value)} required /></label><label>DPS annual rate (%)<input type="number" min="0" max="50" step="0.01" value={form.annualRatePercent} onChange={(event) => updateField("annualRatePercent", event.target.value)} required /></label></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions"><button type="button" className="secondary-button visible" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create pocket"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
