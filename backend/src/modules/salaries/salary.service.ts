import { moneyStringToPaisa, paisaToMoneyString } from "../../shared/money/money.js";
import { AppError } from "../../shared/errors/app-error.js";
import { findSalary, upsertSalary } from "./salary.repository.js";

function serializeSalary(salary: Awaited<ReturnType<typeof findSalary>>) {
  if (!salary) return null;
  return {
    id: salary._id.toString(),
    month: salary.month,
    amount: paisaToMoneyString(salary.amountPaisa),
    createdAt: salary.createdAt.toISOString(),
    updatedAt: salary.updatedAt.toISOString(),
  };
}

export async function getMonthlySalary(firebaseUid: string, month: string) {
  return serializeSalary(await findSalary(firebaseUid, month));
}

export async function setMonthlySalary(firebaseUid: string, month: string, amount: string) {
  const amountPaisa = moneyStringToPaisa(amount);
  if (amountPaisa <= 0) throw new AppError(400, "VALIDATION_ERROR", "Salary must be greater than zero.");
  return serializeSalary(await upsertSalary(firebaseUid, month, amountPaisa));
}
