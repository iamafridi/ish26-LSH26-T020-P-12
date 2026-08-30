import type { NextFunction, Request, Response } from "express";

import { connectDatabase } from "../../config/database.js";
import { AppError } from "../errors/app-error.js";

export async function ensureDatabaseConnection(
  _request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await connectDatabase();
    next();
  } catch {
    next(new AppError(503, "DATABASE_UNAVAILABLE", "The ledger database is temporarily unavailable."));
  }
}
