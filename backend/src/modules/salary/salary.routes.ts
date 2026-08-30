import { Router } from "express";

import { SetSalarySchema, effectiveSalary, listSalaries, setSalary } from "./salary.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { parseInput } from "../../shared/validation/validation.js";
import { MonthInput } from "../../shared/validation/schemas.js";
import { currentMonth } from "../../shared/dates/today.js";

export const salaryRouter = Router();

salaryRouter.use(authenticate);

salaryRouter.get(
  "/",
  handle(async (request, response) => {
    ok(response, { salaries: await listSalaries(request.user!.uid) });
  }),
);

salaryRouter.get(
  "/effective",
  handle(async (request, response) => {
    const month = request.query["month"]
      ? parseInput(MonthInput, request.query["month"])
      : currentMonth();
    ok(response, { month, amount_bdt: await effectiveSalary(request.user!.uid, month) });
  }),
);

salaryRouter.put(
  "/",
  handle(async (request, response) => {
    const input = parseInput(SetSalarySchema, request.body);
    ok(response, { salary: await setSalary(request.user!.uid, input) });
  }),
);
