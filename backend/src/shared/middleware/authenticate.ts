import type { NextFunction, Request, Response } from "express";

import { getFirebaseAdminAuth } from "../../config/firebase-admin.js";
import { AppError } from "../errors/app-error.js";

export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) {
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
    }

    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    request.authenticatedUser = {
      uid: decoded.uid,
      ...(decoded.email ? { email: decoded.email } : {}),
      ...(typeof decoded.name === "string" ? { name: decoded.name } : {}),
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "UNAUTHENTICATED", "Your session is invalid or expired."));
  }
}
