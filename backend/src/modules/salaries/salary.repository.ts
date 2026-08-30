import { SalaryModel, type SalaryDocument } from "./salary.model.js";

export async function findSalary(firebaseUid: string, month: string): Promise<SalaryDocument | null> {
  return SalaryModel.findOne({ firebaseUid, month }).lean<SalaryDocument>().exec();
}

export async function upsertSalary(
  firebaseUid: string,
  month: string,
  amountPaisa: number,
): Promise<SalaryDocument> {
  const salary = await SalaryModel.findOneAndUpdate(
    { firebaseUid, month },
    { $set: { amountPaisa }, $setOnInsert: { firebaseUid, month } },
    { new: true, upsert: true, runValidators: true },
  ).lean<SalaryDocument>().exec();

  if (!salary) throw new Error("Salary upsert returned no document.");
  return salary;
}
