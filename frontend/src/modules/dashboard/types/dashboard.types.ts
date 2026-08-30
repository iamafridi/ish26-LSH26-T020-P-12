export interface DashboardComparison {
  current: string;
  previous: string;
  changeAmount: string;
  changePercentage: number | null;
  direction: "increase" | "decrease" | "same";
}

export interface DashboardData {
  month: string;
  previousMonth: string;
  summary: {
    salary: string | null;
    totalSpent: string;
    remaining: string | null;
    percentageSpent: number | null;
    expenseCount: number;
  };
  categories: Array<{
    category: string;
    amount: string;
    count: number;
    sharePercentage: number;
  }>;
  largestExpenses: Array<{
    id: string;
    amount: string;
    date: string;
    shop: string;
    category: string;
    source: "manual" | "receipt";
  }>;
  comparison: {
    fullMonth: DashboardComparison;
    samePeriod: (DashboardComparison & { throughDay: number }) | null;
  };
}

export interface DashboardResponse {
  success: true;
  data: { dashboard: DashboardData };
}
