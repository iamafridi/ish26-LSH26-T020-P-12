import { Router } from "express";

import {
  CreateExpenseSchema,
  ListExpenseQuery,
  UpdateExpenseSchema,
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "./expense.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { parseInput } from "../../shared/validation/validation.js";

export const expenseRouter = Router();

expenseRouter.use(authenticate);

expenseRouter.get(
  "/",
  handle(async (request, response) => {
    const query = parseInput(ListExpenseQuery, request.query);
    ok(response, { expenses: await listExpenses(request.user!.uid, query) });
  }),
);

expenseRouter.post(
  "/",
  handle(async (request, response) => {
    const input = parseInput(CreateExpenseSchema, request.body);
    ok(response, { expense: await createExpense(request.user!.uid, input) }, 201);
  }),
);

expenseRouter.patch(
  "/:id",
  handle(async (request, response) => {
    const input = parseInput(UpdateExpenseSchema, request.body);
    ok(response, { expense: await updateExpense(request.user!.uid, String(request.params["id"]), input) });
  }),
);

expenseRouter.delete(
  "/:id",
  handle(async (request, response) => {
    await deleteExpense(request.user!.uid, String(request.params["id"]));
    ok(response, { deleted: true });
  }),
);
