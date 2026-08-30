import "dotenv/config";
import { readFileSync } from "node:fs";

import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { ExpenseModel } from "../src/modules/expenses/expense.model.js";
import { SalaryModel } from "../src/modules/salaries/salary.model.js";
import { SavingsPocketModel } from "../src/modules/savings-pockets/savings-pocket.model.js";
import { moneyStringToPaisa } from "../src/shared/money/money.js";

interface SeedCase {
  case_id: string;
  months: { last: string; this: string };
  salary_bdt: string;
  expenses: Array<{ date: string; category: string; shop: string; amount_bdt: string }>;
  pockets: Array<{ name: string; item: string; target_bdt: string; monthly_contribution_bdt: string }>;
  dps_annual_rate_percent: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the public-data seed script.`);
  return value;
}

function rateToBasisPoints(rate: string): number {
  const [whole = "0", fraction = ""] = rate.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

async function seed(): Promise<void> {
  const datasetPath = required("P12_DATASET_PATH");
  const firebaseUid = required("DEMO_USER_UID");
  const requestedCase = process.env.SEED_CASE_ID?.trim() || "PUB-01";
  const dataset = JSON.parse(readFileSync(datasetPath, "utf8")) as { cases: SeedCase[] };
  const selected = dataset.cases.find((item) => item.case_id === requestedCase);
  if (!selected) throw new Error(`Dataset case ${requestedCase} was not found.`);

  await connectDatabase();
  await Promise.all([
    ExpenseModel.deleteMany({ firebaseUid }),
    SalaryModel.deleteMany({ firebaseUid }),
    SavingsPocketModel.deleteMany({ firebaseUid }),
  ]);

  const months = new Set(selected.expenses.map((expense) => expense.date.slice(0, 7)));
  months.add(selected.months.last);
  months.add(selected.months.this);
  await SalaryModel.insertMany([...months].map((month) => ({
    firebaseUid,
    month,
    amountPaisa: moneyStringToPaisa(selected.salary_bdt),
  })));
  await ExpenseModel.insertMany(selected.expenses.map((expense) => ({
    firebaseUid,
    amountPaisa: moneyStringToPaisa(expense.amount_bdt),
    date: expense.date,
    month: expense.date.slice(0, 7),
    shop: expense.shop,
    category: expense.category,
    note: "",
    source: "manual",
  })));
  await SavingsPocketModel.insertMany(selected.pockets.map((pocket) => ({
    firebaseUid,
    name: pocket.name,
    itemDetails: pocket.item,
    targetPaisa: moneyStringToPaisa(pocket.target_bdt),
    currentSavedPaisa: 0,
    monthlyContributionPaisa: moneyStringToPaisa(pocket.monthly_contribution_bdt),
    annualRateBasisPoints: rateToBasisPoints(selected.dps_annual_rate_percent),
  })));

  await disconnectDatabase();
  console.log(`Seeded ${selected.case_id} for the configured demo UID.`);
}

seed().catch((error: unknown) => {
  console.error("Public-data seed failed.", error);
  void disconnectDatabase().finally(() => process.exit(1));
});
