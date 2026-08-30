import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { getAuthenticatedProfile } from "./auth.controller.js";

export const authRouter = Router();
authRouter.get("/me", authenticate, getAuthenticatedProfile);
