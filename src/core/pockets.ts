/**
 * Savings pockets — required item 4.
 *
 * OWNER: Architect.
 *
 * For each pocket we report:
 *   - months to target at the stated monthly contribution
 *   - the expected completion date (end of the month the target is reached)
 *   - what a DPS at the case's stated rate returns over that same period
 *   - whether this month's forecast actually leaves room for the contribution
 *
 * Contributions are assumed to start in the current month, so a pocket needing
 * N months completes at the end of month (this_month + N - 1). The DPS figure
 * runs the SAME contribution for the SAME number of months through the rule in
 * dps.ts, which is what makes "what a DPS would return over that time" a
 * like-for-like comparison rather than a marketing number.
 */
import { fmt, money } from "./money";
import { addMonths, endOfMonth } from "./calendar";
import { monthsToReachPlain, monthsToReachWithDps, runDps } from "./dps";
import type { Forecast, Pocket, PocketProjection } from "./types";

export interface PocketInput {
  pockets: Pocket[];
  thisMonth: string;
  annualRatePercent: string;
  forecast: Forecast;
}

export function projectPockets({
  pockets,
  thisMonth,
  annualRatePercent,
  forecast,
}: PocketInput): PocketProjection[] {
  const headroom = money(forecast.projected_end_position_bdt);

  return pockets.map((pocket) => {
    const contribution = money(pocket.monthly_contribution_bdt);
    const months = monthsToReachPlain(pocket.target_bdt, contribution);

    // A zero or absent contribution never completes; keep the row rather than
    // crashing, and let the UI show it as "not on track".
    const finite = Number.isFinite(months);
    const completionMonth = finite ? addMonths(thisMonth, months - 1) : thisMonth;

    const dps = runDps({
      monthlyDeposit: contribution,
      annualRatePercent,
      months: finite ? months : 0,
    });

    const plainTotal = contribution.times(finite ? months : 0);

    return {
      pocket,
      months_to_target: months,
      expected_completion_date: finite ? endOfMonth(completionMonth) : "—",
      expected_completion_month: finite ? completionMonth : "—",
      plain_total_bdt: fmt(plainTotal),
      dps,
      dps_gain_bdt: fmt(money(dps.maturity_value_bdt).minus(plainTotal)),
      months_to_target_with_dps: monthsToReachWithDps(
        pocket.target_bdt,
        contribution,
        annualRatePercent,
      ),
      affordable_this_month: headroom.greaterThanOrEqualTo(contribution),
    };
  });
}
