import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { getSalary, putSalary } from "./salary.controller.js";

export const salaryRouter = Router();
salaryRouter.use(authenticate);
salaryRouter.get("/:month", getSalary);
salaryRouter.put("/:month", putSalary);
