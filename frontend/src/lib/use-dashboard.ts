"use client";

import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "./api";
import type { Dashboard } from "./types";

/** The current month as YYYY-MM, in the ledger's timezone rather than the
 *  browser's, so the client and the API agree about which month it is. */
export function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export function monthLabel(month: string): string {
  const [year, index] = month.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[Number(index) - 1] ?? month} ${year}`;
}

export function useDashboard(month: string) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<Dashboard>(`/dashboard?month=${month}`));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load your ledger.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}
