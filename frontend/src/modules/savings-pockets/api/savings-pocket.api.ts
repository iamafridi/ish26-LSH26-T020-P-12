import { apiRequest } from "@/lib/api-client";
import type { PocketInput, PocketsResponse } from "../types/savings-pocket.types";

export function fetchPockets(token: string): Promise<PocketsResponse> {
  return apiRequest("/savings-pockets", { token });
}

export function createPocket(input: PocketInput, token: string): Promise<unknown> {
  return apiRequest("/savings-pockets", { method: "POST", token, body: JSON.stringify(input) });
}

export function updatePocket(id: string, input: PocketInput, token: string): Promise<unknown> {
  return apiRequest(`/savings-pockets/${id}`, { method: "PATCH", token, body: JSON.stringify(input) });
}

export function deletePocket(id: string, token: string): Promise<void> {
  return apiRequest(`/savings-pockets/${id}`, { method: "DELETE", token });
}
