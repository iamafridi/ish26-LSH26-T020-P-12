"use client";

import { useEffect, useState } from "react";

import { currentDhakaMonth } from "@/lib/date";
import { formatBDT } from "@/lib/format-money";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { fetchSalary, saveSalary } from "../api/salary.api";
import type { Salary } from "../types/salary.types";

export function SalaryCard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentDhakaMonth);
  const [salary, setSalary] = useState<Salary | null>(null);
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const response = await fetchSalary(month, token);
        if (active) {
          setSalary(response.data.salary);
          setAmount(response.data.salary?.amount ?? "");
          setEditing(response.data.salary === null);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load salary.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [month, user]);

  async function handleSave() {
    if (!user || !amount) return;
    setSaving(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await saveSalary(month, amount, token);
      setSalary(response.data.salary);
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save salary.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="salary-panel">
      <div className="section-heading">
        <div><span>Monthly salary</span><strong>{loading ? "Loading…" : salary ? formatBDT(salary.amount) : "Not set"}</strong></div>
        <input aria-label="Salary month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>
      {editing ? (
        <div className="inline-form">
          <label>Salary amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="50000.00" /></label>
          <button type="button" onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving…" : "Save salary"}</button>
          {salary && <button type="button" className="text-button" onClick={() => { setAmount(salary.amount); setEditing(false); }}>Cancel</button>}
        </div>
      ) : (
        <button type="button" className="text-button" onClick={() => setEditing(true)}>Edit salary</button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
