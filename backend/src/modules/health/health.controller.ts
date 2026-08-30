import type { Request, Response } from "express";

export function getHealth(_request: Request, response: Response): void {
  response.status(200).json({
    success: true,
    data: {
      service: "personal-ledger-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
}
