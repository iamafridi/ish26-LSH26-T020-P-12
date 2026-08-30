import { apiRequest } from "@/lib/api-client";
import type { SalaryResponse } from "../types/salary.types";

export function fetchSalary(month: string, token: string): Promise<SalaryResponse> {
  return apiRequest(`/salaries/${month}`, { token });
}

export function saveSalary(month: string, amount: string, token: string): Promise<SalaryResponse> {
  return apiRequest(`/salaries/${month}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ amount }),
  });
}
