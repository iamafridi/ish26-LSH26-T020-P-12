#!/usr/bin/env python3
"""Independent P12 numerical reference, derived only from the published specification."""

from __future__ import annotations

import calendar
import json
import sys
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP, getcontext
from pathlib import Path
from typing import Any


PAISA = Decimal("0.01")
TENTH = Decimal("0.1")
HUNDRED = Decimal("100")
TWELVE = Decimal("12")

getcontext().prec = 50


def half_up(value: Decimal, quantum: Decimal = PAISA) -> Decimal:
    return value.quantize(quantum, rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    return f"{half_up(value):.2f}"


def percent(value: Decimal) -> str:
    return f"{half_up(value, TENTH):.1f}"


def add_months(month: str, offset: int) -> str:
    year, month_number = map(int, month.split("-"))
    absolute = year * 12 + month_number - 1 + offset
    return f"{absolute // 12:04d}-{absolute % 12 + 1:02d}"


def month_end(month: str) -> str:
    year, month_number = map(int, month.split("-"))
    day = calendar.monthrange(year, month_number)[1]
    return f"{month}-{day:02d}"


def category_breakdown(expenses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, Decimal] = defaultdict(Decimal)
    counts: dict[str, int] = defaultdict(int)
    for expense in expenses:
        totals[expense["category"]] += Decimal(expense["amount_bdt"])
        counts[expense["category"]] += 1
    month_total = sum(totals.values(), Decimal(0))
    result = []
    for category, total in sorted(totals.items(), key=lambda item: (-item[1], item[0])):
        share = Decimal(0) if month_total == 0 else total / month_total * HUNDRED
        result.append(
            {
                "category": category,
                "total_bdt": money(total),
                "share_percent": percent(share),
                "count": counts[category],
            }
        )
    return result


def month_summary(case: dict[str, Any], month: str) -> dict[str, Any]:
    expenses = [expense for expense in case["expenses"] if expense["date"][:7] == month]
    total = sum((Decimal(expense["amount_bdt"]) for expense in expenses), Decimal(0))
    return {
        "month": month,
        "total_spent_bdt": money(total),
        "expense_count": len(expenses),
        "by_category": category_breakdown(expenses),
    }


def forecast(case: dict[str, Any]) -> dict[str, Any]:
    current_month = case["months"]["this"]
    current_expenses = [
        expense for expense in case["expenses"] if expense["date"][:7] == current_month
    ]
    spent = sum((Decimal(expense["amount_bdt"]) for expense in current_expenses), Decimal(0))
    today = date.fromisoformat(case["today"])
    days_elapsed = today.day
    year, month_number = map(int, current_month.split("-"))
    days_in_month = calendar.monthrange(year, month_number)[1]
    days_remaining = days_in_month - days_elapsed
    daily_burn = spent / Decimal(days_elapsed)
    projected_remaining = half_up(daily_burn * Decimal(days_remaining))
    projected_total = spent + projected_remaining
    end_position = Decimal(case["salary_bdt"]) - projected_total
    return {
        "today": case["today"],
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "days_remaining": days_remaining,
        "spent_to_date_bdt": money(spent),
        "daily_burn_bdt": money(daily_burn),
        "projected_remaining_bdt": money(projected_remaining),
        "projected_month_total_bdt": money(projected_total),
        "salary_bdt": money(Decimal(case["salary_bdt"])),
        "projected_end_position_bdt": money(end_position),
        "projected_short": end_position < 0,
    }


def dps_schedule(deposit: Decimal, annual_rate: Decimal, months: int) -> dict[str, Any]:
    balance = Decimal(0)
    schedule = []
    for month_index in range(1, months + 1):
        opening = balance
        after_deposit = opening + deposit
        interest = half_up(after_deposit * annual_rate / TWELVE / HUNDRED)
        balance = after_deposit + interest
        schedule.append(
            {
                "month_index": month_index,
                "opening_balance_bdt": money(opening),
                "deposit_bdt": money(deposit),
                "balance_after_deposit_bdt": money(after_deposit),
                "interest_bdt": money(interest),
                "closing_balance_bdt": money(balance),
            }
        )
    deposited = deposit * months
    return {
        "annual_rate_percent": money(annual_rate),
        "monthly_deposit_bdt": money(deposit),
        "months": months,
        "schedule": schedule,
        "total_deposited_bdt": money(deposited),
        "total_interest_bdt": money(balance - deposited),
        "maturity_value_bdt": money(balance),
    }


def pocket_report(case: dict[str, Any], pocket: dict[str, Any]) -> dict[str, Any]:
    target = Decimal(pocket["target_bdt"])
    contribution = Decimal(pocket["monthly_contribution_bdt"])
    months = int((target / contribution).to_integral_value(rounding=ROUND_CEILING))
    completion_month = add_months(case["months"]["this"], months - 1)
    dps = dps_schedule(contribution, Decimal(case["dps_annual_rate_percent"]), months)
    return {
        "months_to_target": months,
        "expected_completion_date": month_end(completion_month),
        "expected_completion_month": completion_month,
        "plain_total_bdt": money(contribution * months),
        "dps": dps,
        "dps_gain_bdt": dps["total_interest_bdt"],
    }


def build_reference(case: dict[str, Any]) -> dict[str, Any]:
    return {
        "case_id": case["case_id"],
        "comparison": {
            "this_month": month_summary(case, case["months"]["this"]),
            "last_month": month_summary(case, case["months"]["last"]),
        },
        "forecast": forecast(case),
        "pockets": [pocket_report(case, pocket) for pocket in case["pockets"]],
    }


def load_dataset() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[2]
    candidates = (root / "data-p12-public.json", root / "src/data/p12-public.json")
    dataset_path = next((path for path in candidates if path.exists()), None)
    if dataset_path is None:
        raise FileNotFoundError("public P12 dataset not found at either documented path")
    return json.loads(dataset_path.read_text(encoding="utf-8"))


def main() -> None:
    dataset = load_dataset()
    requested = sys.argv[1] if len(sys.argv) > 1 else None
    cases = dataset["cases"]
    if requested:
        cases = [case for case in cases if case["case_id"] == requested]
        if not cases:
            raise SystemExit(f"No such case: {requested}")
        print(json.dumps(build_reference(cases[0]), indent=2))
        return
    print(json.dumps([build_reference(case) for case in cases], indent=2))


if __name__ == "__main__":
    main()
