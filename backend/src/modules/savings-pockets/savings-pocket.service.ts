import { dhakaToday } from "../../shared/dates/month.js";
import { AppError } from "../../shared/errors/app-error.js";
import { moneyStringToPaisa, paisaToMoneyString } from "../../shared/money/money.js";
import { aggregateMonth } from "../dashboard/dashboard.repository.js";
import { calculateForecast } from "../forecasts/forecast.service.js";
import { findSalary } from "../salaries/salary.repository.js";
import {
  createOwnedPocket,
  deleteOwnedPocket,
  findOwnedPocket,
  listOwnedPockets,
  updateOwnedPocket,
  type PocketWrite,
} from "./savings-pocket.repository.js";
import { allocateContribution, calculateDps, completionMonth, completionMonths } from "./savings-pocket.projection.js";

interface PocketInput {
  name: string;
  itemDetails: string;
  targetAmount: string;
  currentSavedAmount?: string;
  monthlyContribution: string;
  annualRatePercent: string;
}

function percentToBasisPoints(percent: string): number {
  const [whole = "0", fraction = ""] = percent.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (value > 5000) throw new AppError(400, "VALIDATION_ERROR", "DPS annual rate cannot exceed 50.00%.");
  return value;
}

function basisPointsToPercent(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function requirePositiveMoney(value: string, label: string): number {
  const paisa = moneyStringToPaisa(value);
  if (paisa <= 0) throw new AppError(400, "VALIDATION_ERROR", `${label} must be greater than zero.`);
  return paisa;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const hundredths = (BigInt(numerator) * 10_000n + BigInt(denominator) / 2n) / BigInt(denominator);
  return Number(hundredths) / 100;
}

function toWrite(input: PocketInput): PocketWrite {
  return {
    name: input.name,
    itemDetails: input.itemDetails,
    targetPaisa: requirePositiveMoney(input.targetAmount, "Target amount"),
    currentSavedPaisa: moneyStringToPaisa(input.currentSavedAmount ?? "0.00"),
    monthlyContributionPaisa: requirePositiveMoney(input.monthlyContribution, "Monthly contribution"),
    annualRateBasisPoints: percentToBasisPoints(input.annualRatePercent),
  };
}

function basePocket(pocket: NonNullable<Awaited<ReturnType<typeof findOwnedPocket>>>) {
  return {
    id: pocket._id.toString(),
    name: pocket.name,
    itemDetails: pocket.itemDetails,
    targetAmount: paisaToMoneyString(pocket.targetPaisa),
    currentSavedAmount: paisaToMoneyString(pocket.currentSavedPaisa),
    monthlyContribution: paisaToMoneyString(pocket.monthlyContributionPaisa),
    annualRatePercent: basisPointsToPercent(pocket.annualRateBasisPoints),
    createdAt: pocket.createdAt.toISOString(),
    updatedAt: pocket.updatedAt.toISOString(),
  };
}

export async function getProjectedPockets(firebaseUid: string) {
  const today = dhakaToday();
  const month = today.slice(0, 7);
  const [pockets, salary, expenseData] = await Promise.all([
    listOwnedPockets(firebaseUid),
    findSalary(firebaseUid, month),
    aggregateMonth(firebaseUid, month),
  ]);
  const totalSpentPaisa = expenseData.totals[0]?.totalPaisa ?? 0;
  const salaryPaisa = salary?.amountPaisa ?? null;
  const forecast = calculateForecast({ selectedMonth: month, today, totalSpentPaisa, salaryPaisa });
  const capacityPaisa = forecast.expectedBalancePaisa === null ? null : Math.max(forecast.expectedBalancePaisa, 0);
  const totalPlannedPaisa = pockets.reduce((sum, pocket) => sum + pocket.monthlyContributionPaisa, 0);

  return {
    month,
    forecastCapacity: capacityPaisa === null ? null : paisaToMoneyString(capacityPaisa),
    totalPlannedContribution: paisaToMoneyString(totalPlannedPaisa),
    affordabilityPercentage: capacityPaisa === null || totalPlannedPaisa === 0
      ? null
      : Math.min(100, percentage(capacityPaisa, totalPlannedPaisa)),
    pockets: pockets.map((pocket) => {
      const remainingPaisa = Math.max(pocket.targetPaisa - pocket.currentSavedPaisa, 0);
      const effectivePaisa = capacityPaisa === null
        ? null
        : allocateContribution(pocket.monthlyContributionPaisa, capacityPaisa, totalPlannedPaisa);
      const months = remainingPaisa === 0 ? 0 : effectivePaisa === null ? null : completionMonths(remainingPaisa, effectivePaisa);
      const dps = effectivePaisa === null ? null : calculateDps(effectivePaisa, pocket.annualRateBasisPoints, months);
      const status = remainingPaisa === 0 ? "complete" : capacityPaisa === null ? "salary-required" : effectivePaisa === 0 ? "not-affordable" : "active";

      return {
        ...basePocket(pocket),
        projection: {
          status,
          progressPercentage: pocket.targetPaisa > 0 ? Math.min(100, percentage(pocket.currentSavedPaisa, pocket.targetPaisa)) : 0,
          remainingAmount: paisaToMoneyString(remainingPaisa),
          effectiveMonthlyContribution: effectivePaisa === null ? null : paisaToMoneyString(effectivePaisa),
          completionMonths: months,
          completionMonth: completionMonth(month, months),
          dps: dps ? {
            calculationAvailable: dps.calculationAvailable,
            annualRatePercent: basisPointsToPercent(pocket.annualRateBasisPoints),
            durationMonths: dps.months,
            monthlyDeposit: paisaToMoneyString(dps.monthlyDepositPaisa),
            totalDeposits: paisaToMoneyString(dps.totalDepositsPaisa),
            interestEarned: paisaToMoneyString(dps.interestEarnedPaisa),
            finalValue: paisaToMoneyString(dps.finalValuePaisa),
          } : null,
        },
      };
    }),
  };
}

export async function createPocket(firebaseUid: string, input: PocketInput) {
  return basePocket(await createOwnedPocket(firebaseUid, toWrite(input)));
}

export async function getProjectedPocket(firebaseUid: string, id: string) {
  const result = await getProjectedPockets(firebaseUid);
  const pocket = result.pockets.find((item) => item.id === id);
  if (!pocket) throw new AppError(404, "NOT_FOUND", "Savings pocket not found.");
  return pocket;
}

export async function updatePocket(firebaseUid: string, id: string, input: Partial<PocketInput>) {
  const existing = await findOwnedPocket(firebaseUid, id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Savings pocket not found.");
  const write: Partial<PocketWrite> = {};
  if (input.name !== undefined) write.name = input.name;
  if (input.itemDetails !== undefined) write.itemDetails = input.itemDetails;
  if (input.targetAmount !== undefined) write.targetPaisa = requirePositiveMoney(input.targetAmount, "Target amount");
  if (input.currentSavedAmount !== undefined) write.currentSavedPaisa = moneyStringToPaisa(input.currentSavedAmount);
  if (input.monthlyContribution !== undefined) write.monthlyContributionPaisa = requirePositiveMoney(input.monthlyContribution, "Monthly contribution");
  if (input.annualRatePercent !== undefined) write.annualRateBasisPoints = percentToBasisPoints(input.annualRatePercent);
  const updated = await updateOwnedPocket(firebaseUid, id, write);
  if (!updated) throw new AppError(404, "NOT_FOUND", "Savings pocket not found.");
  return basePocket(updated);
}

export async function removePocket(firebaseUid: string, id: string): Promise<void> {
  if (!(await deleteOwnedPocket(firebaseUid, id))) throw new AppError(404, "NOT_FOUND", "Savings pocket not found.");
}
