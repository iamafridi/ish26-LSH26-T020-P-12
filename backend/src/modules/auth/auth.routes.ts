import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { getSettings } from "../settings/settings.service.js";

export const authRouter = Router();

/**
 * Echoes back the identity the API derived from the caller's token. The frontend
 * calls it once after sign-in to confirm the whole chain works — Firebase issued
 * a token, this service verified it against Google's keys, and the database
 * answered. One request that proves the connection, rather than three separate
 * failures the user has to interpret.
 */
authRouter.get(
  "/me",
  authenticate,
  handle(async (request, response) => {
    const user = request.user!;
    ok(response, {
      uid: user.uid,
      email: user.email,
      name: user.name,
      settings: await getSettings(user.uid),
    });
  }),
);
