import { addMonths } from "../../shared/dates/month.js";

const MAX_DPS_SIMULATION_MONTHS = 1200;

function divideHalfUpBigInt(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function allocateContribution(plannedPaisa: number, capacityPaisa: number, totalPlannedPaisa: number): number {
  if (capacityPaisa <= 0 || totalPlannedPaisa <= 0) return 0;
  if (capacityPaisa >= totalPlannedPaisa) return plannedPaisa;
  return Number((BigInt(plannedPaisa) * BigInt(capacityPaisa)) / BigInt(totalPlannedPaisa));
}

export function completionMonths(remainingPaisa: number, contributionPaisa: number): number | null {
  if (remainingPaisa <= 0) return 0;
  if (contributionPaisa <= 0) return null;
  return Math.ceil(remainingPaisa / contributionPaisa);
}

export function completionMonth(baseMonth: string, months: number | null): string | null {
  return months === null ? null : addMonths(baseMonth, months);
}

export interface DpsProjection {
  months: number;
  monthlyDepositPaisa: number;
  totalDepositsPaisa: number;
  interestEarnedPaisa: number;
  finalValuePaisa: number;
  calculationAvailable: boolean;
}

export function calculateDps(monthlyDepositPaisa: number, annualRateBasisPoints: number, months: number | null): DpsProjection | null {
  if (months === null || monthlyDepositPaisa <= 0) return null;
  if (months > MAX_DPS_SIMULATION_MONTHS) {
    return { months, monthlyDepositPaisa, totalDepositsPaisa: 0, interestEarnedPaisa: 0, finalValuePaisa: 0, calculationAvailable: false };
  }
  let balance = 0n;
  const deposit = BigInt(monthlyDepositPaisa);
  const rate = BigInt(annualRateBasisPoints);
  const monthlyRateDenominator = 120_000n;
  for (let month = 0; month < months; month += 1) {
    balance += deposit;
    balance += divideHalfUpBigInt(balance * rate, monthlyRateDenominator);
  }
  const deposits = deposit * BigInt(months);
  return {
    months,
    monthlyDepositPaisa,
    totalDepositsPaisa: Number(deposits),
    interestEarnedPaisa: Number(balance - deposits),
    finalValuePaisa: Number(balance),
    calculationAvailable: true,
  };
}
