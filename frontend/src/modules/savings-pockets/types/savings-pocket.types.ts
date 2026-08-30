export interface PocketInput {
  name: string;
  itemDetails: string;
  targetAmount: string;
  currentSavedAmount: string;
  monthlyContribution: string;
  annualRatePercent: string;
}

export interface SavingsPocket extends PocketInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  projection: {
    status: "complete" | "salary-required" | "not-affordable" | "active";
    progressPercentage: number;
    remainingAmount: string;
    effectiveMonthlyContribution: string | null;
    completionMonths: number | null;
    completionMonth: string | null;
    dps: {
      calculationAvailable: boolean;
      annualRatePercent: string;
      durationMonths: number;
      monthlyDeposit: string;
      totalDeposits: string;
      interestEarned: string;
      finalValue: string;
    } | null;
  };
}

export interface PocketsResponse {
  success: true;
  data: {
    month: string;
    forecastCapacity: string | null;
    totalPlannedContribution: string;
    affordabilityPercentage: number | null;
    pockets: SavingsPocket[];
  };
}
