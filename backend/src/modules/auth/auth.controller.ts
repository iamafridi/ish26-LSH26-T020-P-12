import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/app-error.js";

export function getAuthenticatedProfile(request: Request, response: Response): void {
  if (!request.authenticatedUser) {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  }

  response.status(200).json({
    success: true,
    data: {
      user: request.authenticatedUser,
    },
  });
}
