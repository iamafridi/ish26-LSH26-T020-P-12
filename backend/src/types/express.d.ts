import type { AuthenticatedUser } from "../shared/types/authenticated-user.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

export {};
