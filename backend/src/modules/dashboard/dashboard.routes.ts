import { Router } from "express";

import { buildDashboard } from "./dashboard.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { parseInput } from "../../shared/validation/validation.js";
import { MonthInput } from "../../shared/validation/schemas.js";
import { currentMonth } from "../../shared/dates/today.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/",
  handle(async (request, response) => {
    const month = request.query["month"]
      ? parseInput(MonthInput, request.query["month"])
      : currentMonth();

    ok(response, await buildDashboard(request.user!.uid, month));
  }),
);
