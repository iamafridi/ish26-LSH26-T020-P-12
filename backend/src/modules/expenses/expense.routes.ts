import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { create, getOne, list, remove, update } from "./expense.controller.js";

export const expenseRouter = Router();
expenseRouter.use(authenticate);
expenseRouter.get("/", list);
expenseRouter.post("/", create);
expenseRouter.get("/:id", getOne);
expenseRouter.patch("/:id", update);
expenseRouter.delete("/:id", remove);
