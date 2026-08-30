/**
 * Per-user settings. Currently just the DPS rate the app quotes returns at.
 */
import { z } from "zod";

import { DEFAULT_DPS_RATE, SettingsModel } from "./settings.model.js";
import { RateInput } from "../../shared/validation/schemas.js";

export const UpdateSettingsSchema = z.object({
  dps_annual_rate_percent: RateInput,
});

export interface SettingsView {
  dps_annual_rate_percent: string;
  currency: string;
}

export async function getSettings(uid: string): Promise<SettingsView> {
  const found = await SettingsModel.findOne({ uid }).lean();
  return {
    dps_annual_rate_percent: found?.dps_annual_rate_percent ?? DEFAULT_DPS_RATE,
    currency: found?.currency ?? "BDT",
  };
}

export async function updateSettings(
  uid: string,
  input: z.output<typeof UpdateSettingsSchema>,
): Promise<SettingsView> {
  const saved = await SettingsModel.findOneAndUpdate(
    { uid },
    { $set: input },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  return {
    dps_annual_rate_percent: saved!.dps_annual_rate_percent,
    currency: saved!.currency ?? "BDT",
  };
}
