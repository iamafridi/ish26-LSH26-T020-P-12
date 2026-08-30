import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { ensureDatabaseConnection } from "../../shared/middleware/database-connection.js";
import { getDashboard } from "./dashboard.controller.js";

export const dashboardRouter = Router();
dashboardRouter.get("/", authenticate, ensureDatabaseConnection, getDashboard);
