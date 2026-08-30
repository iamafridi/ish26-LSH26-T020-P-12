import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { expenseRouter } from "./modules/expenses/expense.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { receiptRouter } from "./modules/receipts/receipt.routes.js";
import { salaryRouter } from "./modules/salaries/salary.routes.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { notFound } from "./shared/middleware/not-found.js";

export interface AppOptions {
  frontendUrl?: string;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const frontendUrl = options.frontendUrl ?? "http://localhost:3000";

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/salaries", salaryRouter);
  app.use("/api/v1/expenses", expenseRouter);
  app.use("/api/v1/receipts", receiptRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
