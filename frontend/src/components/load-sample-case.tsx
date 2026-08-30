"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/api";

/**
 * Loads one of the twenty-five official P12 public cases into the signed-in
 * account.
 *
 * An empty ledger demonstrates none of the four required items, so this exists
 * to put real, checkable data in front of anyone opening the application for the
 * first time. The figures that follow are the engine's output over data whose
 * expected results are published, so the dashboard can be checked against the
 * dataset by hand rather than taken on trust.
 */
export function LoadSampleCase({ onLoaded }: { onLoaded: (month: string) => void }) {
  const [caseId, setCaseId] = useState("PUB-01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cases = Array.from(
    { length: 25 },
    (_, index) => `PUB-${String(index + 1).padStart(2, "0")}`,
  );

  return (
    <div className="stack" style={{ alignItems: "center", gap: "var(--s-3)" }}>
      <p className="label">Or load an official case from the P12 dataset</p>

      {error ? (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="row" style={{ justifyContent: "center", gap: "var(--s-2)" }}>
        <label className="sr-only" htmlFor="sample-case">
          Which published case to load
        </label>
        <select
          id="sample-case"
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
          style={{
            minHeight: "44px",
            padding: "0 var(--s-3)",
            background: "var(--paper)",
            border: "1px solid var(--rule-firm)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {cases.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              const { seeded } = await api<{ seeded: { month: string } }>("/demo/seed", {
                method: "POST",
                body: { case_id: caseId },
              });
              // Jump to the month the case is about, so the data is visible
              // immediately rather than sitting in a month nobody is looking at.
              onLoaded(seeded.month);
            } catch (caught) {
              setError(caught instanceof ApiError ? caught.message : "Could not load that case.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Loading…" : "Load case"}
        </button>
      </div>

      <p className="note" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}>
        Writes that case&rsquo;s salary, expenses and savings pockets into your account. Loading
        again replaces them rather than doubling them.
      </p>
    </div>
  );
}
