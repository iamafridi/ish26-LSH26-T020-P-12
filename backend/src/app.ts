import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { allowedOrigins } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { demoRouter } from "./modules/demo/demo.routes.js";
import { expenseRouter } from "./modules/expenses/expense.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { pocketRouter } from "./modules/pockets/pocket.routes.js";
import { receiptRouter } from "./modules/receipts/receipt.routes.js";
import { salaryRouter } from "./modules/salary/salary.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { errorHandler, notFound } from "./shared/middleware/error-handler.js";

export function createApp(): Express {
  const app = express();
  const origins = allowedOrigins();

  app.disable("x-powered-by");
  // Render terminates TLS in front of the app; without this, express-rate-limit
  // sees every request as coming from the proxy and rate-limits all users as one.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // A server-to-server call or a curl has no Origin header. CORS exists to
        // protect browsers, so those are not the thing it is guarding against.
        if (!origin || origins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed.`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/demo", demoRouter);
  app.use("/api/v1/salaries", salaryRouter);
  app.use("/api/v1/expenses", expenseRouter);
  app.use("/api/v1/savings-pockets", pocketRouter);
  app.use("/api/v1/receipts", receiptRouter);
  app.use("/api/v1/settings", settingsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
