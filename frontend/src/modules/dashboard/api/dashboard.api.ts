import { apiRequest } from "@/lib/api-client";
import type { DashboardResponse } from "../types/dashboard.types";

export function fetchDashboard(month: string, token: string): Promise<DashboardResponse> {
  return apiRequest(`/dashboard?month=${encodeURIComponent(month)}`, { token });
}
