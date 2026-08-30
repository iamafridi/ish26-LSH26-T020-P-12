import type { VerifiedUser } from "../shared/auth/verify-token.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. Absent on public routes. */
      user?: VerifiedUser;
    }
  }
}

export {};
