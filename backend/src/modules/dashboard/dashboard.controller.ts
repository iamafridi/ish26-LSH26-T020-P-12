import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/app-error.js";
import { parseInput } from "../../shared/validation/validation.js";
import { monthSchema } from "../salaries/salary.validation.js";
import { buildDashboard } from "./dashboard.service.js";

export async function getDashboard(request: Request, response: Response): Promise<void> {
  if (!request.authenticatedUser) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const month = parseInput(monthSchema, request.query.month);
  response.json({ success: true, data: { dashboard: await buildDashboard(request.authenticatedUser.uid, month) } });
}
