import { daysInMonth, dhakaToday, previousMonth } from "../../shared/dates/month.js";
import { paisaToMoneyString } from "../../shared/money/money.js";
import { findSalary } from "../salaries/salary.repository.js";
import { aggregateMonth, aggregatePeriodTotal } from "./dashboard.repository.js";

function changePercentage(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) * 10_000) / previous) / 100;
}

function comparison(current: number, previous: number) {
  return {
    current: paisaToMoneyString(current),
    previous: paisaToMoneyString(previous),
    changeAmount: paisaToMoneyString(current - previous),
    changePercentage: changePercentage(current, previous),
    direction: current === previous ? "same" : current > previous ? "increase" : "decrease",
  };
}

export async function buildDashboard(firebaseUid: string, month: string) {
  const priorMonth = previousMonth(month);
  const [salary, currentData, previousData] = await Promise.all([
    findSalary(firebaseUid, month),
    aggregateMonth(firebaseUid, month),
    aggregateMonth(firebaseUid, priorMonth),
  ]);

  const totalPaisa = currentData.totals[0]?.totalPaisa ?? 0;
  const previousTotalPaisa = previousData.totals[0]?.totalPaisa ?? 0;
  const salaryPaisa = salary?.amountPaisa ?? null;
  const remainingPaisa = salaryPaisa === null ? null : salaryPaisa - totalPaisa;
  const percentageSpent = salaryPaisa && salaryPaisa > 0
    ? Math.round((totalPaisa * 10_000) / salaryPaisa) / 100
    : null;

  const today = dhakaToday();
  const currentMonth = today.slice(0, 7);
  let samePeriod = null;
  if (month === currentMonth) {
    const currentDay = Number(today.slice(8, 10));
    const priorDay = Math.min(currentDay, daysInMonth(priorMonth));
    const [currentThroughDay, previousThroughDay] = await Promise.all([
      aggregatePeriodTotal(firebaseUid, month, currentDay),
      aggregatePeriodTotal(firebaseUid, priorMonth, priorDay),
    ]);
    samePeriod = { throughDay: currentDay, ...comparison(currentThroughDay, previousThroughDay) };
  }

  return {
    month,
    previousMonth: priorMonth,
    summary: {
      salary: salaryPaisa === null ? null : paisaToMoneyString(salaryPaisa),
      totalSpent: paisaToMoneyString(totalPaisa),
      remaining: remainingPaisa === null ? null : paisaToMoneyString(remainingPaisa),
      percentageSpent,
      expenseCount: currentData.totals[0]?.count ?? 0,
    },
    categories: currentData.categories.map((category) => ({
      category: category._id,
      amount: paisaToMoneyString(category.totalPaisa),
      count: category.count,
      sharePercentage: totalPaisa > 0 ? Math.round((category.totalPaisa * 10_000) / totalPaisa) / 100 : 0,
    })),
    largestExpenses: currentData.largest.map((expense) => ({
      id: expense._id.toString(),
      amount: paisaToMoneyString(expense.amountPaisa),
      date: expense.date,
      shop: expense.shop,
      category: expense.category,
      source: expense.source,
    })),
    comparison: {
      fullMonth: comparison(totalPaisa, previousTotalPaisa),
      samePeriod,
    },
  };
}
