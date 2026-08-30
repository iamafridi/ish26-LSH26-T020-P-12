"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type { AuthenticatedProfileResponse } from "@/modules/auth/types/auth.types";

type Status = "checking" | "connected" | "failed";

export function ConnectionStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;
    async function verifyConnection() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        await apiRequest<AuthenticatedProfileResponse>("/auth/me", { token });
        if (active) setStatus("connected");
      } catch {
        if (active) setStatus("failed");
      }
    }
    void verifyConnection();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <section className="status-card" aria-live="polite">
      <span className={`status-dot ${status}`} aria-hidden="true" />
      <div>
        <strong>
          {status === "checking" && "Checking secure connection"}
          {status === "connected" && "Frontend and API connected"}
          {status === "failed" && "API connection needs attention"}
        </strong>
        <p>
          {status === "failed"
            ? "Confirm that the backend is running and Firebase settings match."
            : "Your authenticated ledger request is verified by the backend."}
        </p>
      </div>
    </section>
  );
}
