"use client";

import { useCallback, useEffect, useState } from "react";

import { Amount } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { toCanonical } from "@/lib/money";
import { currentMonth, monthLabel } from "@/lib/use-dashboard";

/**
 * Salary is set per month — required item 1's first half — and the DPS rate is
 * editable because required item 4 asks for a return "at a rate you state". A
 * rate the user cannot see or change is not a stated rate.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());

  const [salary, setSalary] = useState("");
  const [storedSalary, setStoredSalary] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Record<string, string> | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ amount_bdt }, { settings }] = await Promise.all([
        api<{ month: string; amount_bdt: string }>(`/salaries/effective?month=${month}`),
        api<{ settings: { dps_annual_rate_percent: string } }>("/settings"),
      ]);
      setStoredSalary(amount_bdt);
      setSalary(amount_bdt === "0.00" ? "" : amount_bdt);
      setRate(settings.dps_annual_rate_percent);
    } catch {
      setStatus({ tone: "error", message: "Could not load your settings." });
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<Record<string, string>>("/health").then(setHealth).catch(() => setHealth(null));
  }, []);

  async function saveSalary(event: React.FormEvent) {
    event.preventDefault();
    const amount = toCanonical(salary);
    if (!amount.ok) return setStatus({ tone: "error", message: amount.reason });

    setBusy(true);
    try {
      await api("/salaries", { method: "PUT", body: { month, amount_bdt: amount.value } });
      setStoredSalary(amount.value);
      setStatus({ tone: "ok", message: `Salary for ${monthLabel(month)} saved.` });
    } catch (caught) {
      setStatus({
        tone: "error",
        message: caught instanceof ApiError ? caught.message : "Could not save the salary.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveRate(event: React.FormEvent) {
    event.preventDefault();
    const parsed = toCanonical(rate);
    if (!parsed.ok) return setStatus({ tone: "error", message: parsed.reason });

    setBusy(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: { dps_annual_rate_percent: parsed.value },
      });
      setStatus({ tone: "ok", message: `DPS rate set to ${parsed.value}% a year.` });
    } catch (caught) {
      setStatus({
        tone: "error",
        message: caught instanceof ApiError ? caught.message : "Could not save the rate.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="section">
        <p className="eyebrow">01 &nbsp; Salary</p>

        {status ? (
          <p
            className={`alert ${status.tone === "error" ? "alert--error" : "alert--ok"}`}
            role="status"
            style={{ marginTop: "var(--s-4)" }}
          >
            {status.message}
          </p>
        ) : null}

        <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)", alignItems: "start" }}>
          <form className="panel stack" onSubmit={saveSalary} noValidate>
            <div className="panel-head">
              <h2 style={{ fontSize: "var(--t-lg)" }}>Monthly salary</h2>
              <MonthPicker month={month} onChange={setMonth} />
            </div>

            <div className="field">
              <label className="label" htmlFor="salary">
                Salary for {monthLabel(month)}
              </label>
              <input
                id="salary"
                inputMode="decimal"
                placeholder="0.00"
                value={salary}
                onChange={(event) => setSalary(event.target.value)}
              />
            </div>

            <div className="row">
              <button className="btn" type="submit" disabled={busy}>
                Save salary
              </button>
              {storedSalary && storedSalary !== "0.00" ? (
                <span className="note" style={{ margin: 0 }}>
                  currently <Amount value={storedSalary} />
                </span>
              ) : null}
            </div>
          </form>

          <p className="note">
            Salary is recorded against a month, not against your profile. A raise in June should not
            silently restate April&rsquo;s dashboard, and comparing two months only means something
            if each is measured against the salary that actually applied to it. A month you have not
            set inherits the most recent earlier one.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">02 &nbsp; DPS rate</p>
        <div className="grid grid-sidebar" style={{ marginTop: "var(--s-5)", alignItems: "start" }}>
          <form className="panel stack" onSubmit={saveRate} noValidate>
            <div className="field">
              <label className="label" htmlFor="rate">
                Annual rate, percent
              </label>
              <input
                id="rate"
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </div>
            <div className="row">
              <button className="btn" type="submit" disabled={busy}>
                Save rate
              </button>
            </div>
          </form>

          <p className="note">
            Every DPS figure in this app is computed at this rate, month by month: the deposit is
            added, then interest of balance × rate ÷ 12 ÷ 100 is rounded half-up to the paisa and
            joins the balance, so later months earn on it. The full schedule is on each pocket.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">03 &nbsp; This deployment</p>
        <dl className="panel stack" style={{ gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
          {[
            ["Signed in as", user?.email ?? "—"],
            ["API", health ? "connected" : "unreachable"],
            ["Database", health?.database ?? "—"],
            ["Receipt reading", health?.receipt_ocr === "none" ? "not configured" : (health?.receipt_ocr ?? "—")],
            ["Ledger date", health?.ledger_date ?? "—"],
          ].map(([term, value]) => (
            <div className="row-between" key={term}>
              <dt className="note" style={{ margin: 0 }}>
                {term}
              </dt>
              <dd className="mono" style={{ margin: 0, fontSize: "var(--t-sm)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
