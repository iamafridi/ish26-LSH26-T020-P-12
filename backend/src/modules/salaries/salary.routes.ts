import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { ensureDatabaseConnection } from "../../shared/middleware/database-connection.js";
import { getSalary, putSalary } from "./salary.controller.js";

export const salaryRouter = Router();
salaryRouter.use(authenticate, ensureDatabaseConnection);
salaryRouter.get("/:month", getSalary);
salaryRouter.put("/:month", putSalary);
