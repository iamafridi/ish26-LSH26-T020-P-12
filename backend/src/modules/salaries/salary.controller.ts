import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/app-error.js";
import { parseInput } from "../../shared/validation/validation.js";
import { getMonthlySalary, setMonthlySalary } from "./salary.service.js";
import { monthSchema, setSalarySchema } from "./salary.validation.js";

function userId(request: Request): string {
  if (!request.authenticatedUser) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return request.authenticatedUser.uid;
}

export async function getSalary(request: Request, response: Response): Promise<void> {
  const month = parseInput(monthSchema, request.params.month);
  response.json({ success: true, data: { salary: await getMonthlySalary(userId(request), month) } });
}

export async function putSalary(request: Request, response: Response): Promise<void> {
  const month = parseInput(monthSchema, request.params.month);
  const input = parseInput(setSalarySchema, request.body);
  response.json({ success: true, data: { salary: await setMonthlySalary(userId(request), month, input.amount) } });
}
