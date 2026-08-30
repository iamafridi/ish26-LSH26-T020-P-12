import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";

import { AppError } from "../../shared/errors/app-error.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { confirm, extract } from "./receipt.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const extractionLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

function receiveReceipt(request: Request, response: Response, next: NextFunction): void {
  upload.single("receipt")(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError(413, "RECEIPT_TOO_LARGE", "Receipt images must be 5 MB or smaller."));
      return;
    }
    if (error) {
      next(new AppError(400, "VALIDATION_ERROR", "The receipt upload could not be processed."));
      return;
    }
    next();
  });
}

export const receiptRouter = Router();
receiptRouter.post("/extract", authenticate, extractionLimit, receiveReceipt, extract);
receiptRouter.post("/confirm", authenticate, confirm);
