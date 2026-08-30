/**
 * Loads a case from the official P12 public dataset into the signed-in user's
 * account, so the application can be seen holding real, checkable data.
 *
 * WHY THIS EXISTS
 * A judge opening a fresh account sees an empty ledger, and an empty ledger
 * demonstrates none of the four required items. Rather than shipping fake
 * screenshots or a separate demo build, this writes one of the twenty-five
 * published cases straight into MongoDB through the same models the application
 * uses. Every figure that then appears on the dashboard is the engine's output
 * over data whose expected results are already published — so the interface can
 * be checked against the dataset by hand.
 *
 * It is destructive within its own scope on purpose: loading a case twice should
 * give the same ledger, not a doubled one.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DatasetSchema, type LedgerCase } from "../../core/types.js";
import { notFoundError } from "../../shared/errors/app-error.js";
import { ExpenseModel } from "../expenses/expense.model.js";
import { PocketModel } from "../pockets/pocket.model.js";
import { SalaryModel } from "../salary/salary.model.js";
import { SettingsModel } from "../settings/settings.model.js";
import { CATEGORIES } from "../../shared/ocr/types.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The compiled service runs from dist/, the dev server from src/. The data
 * directory is copied alongside the build, so try both rather than guessing.
 */
function loadDataset() {
  const candidates = [
    join(here, "../../data/p12-public.json"),
    join(here, "../../../src/data/p12-public.json"),
  ];

  for (const path of candidates) {
    try {
      return DatasetSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("The P12 public dataset could not be found next to the build.");
}

let cached: ReturnType<typeof loadDataset> | undefined;

function dataset() {
  cached ??= loadDataset();
  return cached;
}

export function listCases(): Array<{
  case_id: string;
  today: string;
  months: { last: string; this: string };
  salary_bdt: string;
  expense_count: number;
  pocket_count: number;
}> {
  return dataset().cases.map((c) => ({
    case_id: c.case_id,
    today: c.today,
    months: c.months,
    salary_bdt: c.salary_bdt,
    expense_count: c.expenses.length,
    pocket_count: c.pockets.length,
  }));
}

export function findCase(caseId: string): LedgerCase {
  const found = dataset().cases.find((c) => c.case_id === caseId);
  if (!found) throw notFoundError(`No public case named ${caseId}.`);
  return found;
}

export interface SeedResult {
  case_id: string;
  month: string;
  last_month: string;
  expenses: number;
  pockets: number;
  salary_bdt: string;
}

/**
 * Write one case into this user's account.
 *
 * The dataset's categories are the same ten the application uses — verified
 * across all 25 cases — but an unexpected label is mapped rather than rejected,
 * because a row silently dropped here would make the dashboard disagree with the
 * published totals and that disagreement would be very hard to trace.
 */
export async function seedCase(uid: string, caseId: string): Promise<SeedResult> {
  const source = findCase(caseId);
  const months = [source.months.this, source.months.last];

  // Clear only what this case covers, so loading a case twice is idempotent and
  // a user's own unrelated months are left alone.
  await Promise.all([
    ExpenseModel.deleteMany({ uid, month: { $in: months } }),
    PocketModel.deleteMany({ uid }),
    SalaryModel.deleteMany({ uid, month: { $in: months } }),
  ]);

  const known = new Set<string>(CATEGORIES);

  await ExpenseModel.insertMany(
    source.expenses.map((expense) => ({
      uid,
      date: expense.date,
      month: expense.date.slice(0, 7),
      category: known.has(expense.category) ? expense.category : "Food",
      shop: expense.shop,
      amount_bdt: expense.amount_bdt,
      source: "manual",
      note: "",
    })),
  );

  await PocketModel.insertMany(
    source.pockets.map((pocket) => ({
      uid,
      name: pocket.name,
      item: pocket.item,
      target_bdt: pocket.target_bdt,
      monthly_contribution_bdt: pocket.monthly_contribution_bdt,
      saved_bdt: "0.00",
    })),
  );

  // The salary applies to both months the case covers, so the comparison has a
  // salary on each side rather than falling back for the earlier one.
  await SalaryModel.insertMany(
    months.map((month) => ({ uid, month, amount_bdt: source.salary_bdt })),
  );

  // The case states its own DPS rate; the pocket projections are meaningless
  // against a different one.
  await SettingsModel.findOneAndUpdate(
    { uid },
    // The case's own `today` too: without it the forecast would treat a past
    // month as finished and report the actual total rather than the published
    // projection, so the dashboard would silently disagree with the dataset.
    { $set: { dps_annual_rate_percent: source.dps_annual_rate_percent, as_of_date: source.today } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return {
    case_id: source.case_id,
    month: source.months.this,
    last_month: source.months.last,
    expenses: source.expenses.length,
    pockets: source.pockets.length,
    salary_bdt: source.salary_bdt,
  };
}

/** Remove everything this user has. Used by the "clear" action next to seeding. */
export async function clearUser(uid: string): Promise<void> {
  await Promise.all([
    ExpenseModel.deleteMany({ uid }),
    PocketModel.deleteMany({ uid }),
    SalaryModel.deleteMany({ uid }),
  ]);
}
