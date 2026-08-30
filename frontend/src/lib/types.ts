/**
 * The API's response shapes, mirrored for the client.
 *
 * Every `*_bdt` field is a canonical 2dp string computed by the engine. They are
 * typed as `string` and not as `number` on purpose — the type is the reminder.
 */

export const CATEGORIES = [
  "Clothing",
  "Education",
  "Entertainment",
  "Food",
  "Groceries",
  "Health",
  "Mobile",
  "Rent",
  "Transport",
  "Utilities",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  date: string;
  month: string;
  category: Category;
  shop: string;
  amount_bdt: string;
  source: "manual" | "receipt";
  note: string;
}

export interface Pocket {
  id: string;
  name: string;
  item: string;
  target_bdt: string;
  monthly_contribution_bdt: string;
  saved_bdt: string;
}

export interface CategoryLine {
  category: string;
  total_bdt: string;
  share_percent: string;
  count: number;
}

export interface MonthSummary {
  month: string;
  total_spent_bdt: string;
  expense_count: number;
  by_category: CategoryLine[];
  largest_expenses: Array<{
    id: string;
    date: string;
    category: string;
    shop: string;
    amount_bdt: string;
  }>;
}

export interface MonthComparison {
  this_month: MonthSummary;
  last_month: MonthSummary;
  delta_bdt: string;
  delta_percent: string | null;
  category_deltas: Array<{
    category: string;
    this_bdt: string;
    last_bdt: string;
    delta_bdt: string;
    delta_percent: string | null;
  }>;
}

export interface Forecast {
  today: string;
  days_elapsed: number;
  days_in_month: number;
  days_remaining: number;
  spent_to_date_bdt: string;
  daily_burn_bdt: string;
  projected_remaining_bdt: string;
  projected_month_total_bdt: string;
  salary_bdt: string;
  projected_end_position_bdt: string;
  projected_short: boolean;
  projected_end_position_after_pockets_bdt: string;
  total_pocket_contribution_bdt: string;
}

export interface Insight {
  id: string;
  severity: "critical" | "warning" | "info";
  text: string;
  evidence: {
    category?: string;
    amount_bdt?: string;
    percent?: string;
    comparison_bdt?: string;
  };
}

export interface DpsMonth {
  month_index: number;
  opening_balance_bdt: string;
  deposit_bdt: string;
  balance_after_deposit_bdt: string;
  interest_bdt: string;
  closing_balance_bdt: string;
}

export interface DpsResult {
  annual_rate_percent: string;
  monthly_deposit_bdt: string;
  months: number;
  schedule: DpsMonth[];
  total_deposited_bdt: string;
  total_interest_bdt: string;
  maturity_value_bdt: string;
}

export interface PocketProjection {
  pocket: { id: string; name: string; item: string; target_bdt: string; monthly_contribution_bdt: string };
  months_to_target: number | null;
  expected_completion_date: string;
  expected_completion_month: string;
  plain_total_bdt: string;
  dps: DpsResult;
  dps_gain_bdt: string;
  months_to_target_with_dps: number | null;
  affordable_this_month: boolean;
  affordable_monthly_bdt: string;
  forecast_months_to_target: number | null;
  forecast_completion_date: string;
  on_track: boolean;
}

export interface LedgerReport {
  case_id: string;
  comparison: MonthComparison;
  forecast: Forecast;
  insights: Insight[];
  pockets: PocketProjection[];
}

export interface Dashboard {
  month: string;
  last_month: string;
  today: string;
  dps_annual_rate_percent: string;
  dps_rule: string;
  report: LedgerReport;
}

export type FieldConfidence = "high" | "medium" | "low";

export interface ExtractedField<T> {
  value: T | null;
  confidence: FieldConfidence;
  raw: string | null;
}

export interface ReceiptExtraction {
  amount: ExtractedField<string>;
  date: ExtractedField<string>;
  shop: ExtractedField<string>;
  category: ExtractedField<string>;
  error: string | null;
}

export interface ScanResult {
  provider: string;
  extraction: ReceiptExtraction;
  review_required?: boolean;
}
