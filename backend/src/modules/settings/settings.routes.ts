import { Router } from "express";

import { UpdateSettingsSchema, getSettings, updateSettings } from "./settings.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { parseInput } from "../../shared/validation/validation.js";

export const settingsRouter = Router();

settingsRouter.use(authenticate);

settingsRouter.get(
  "/",
  handle(async (request, response) => {
    ok(response, { settings: await getSettings(request.user!.uid) });
  }),
);

settingsRouter.put(
  "/",
  handle(async (request, response) => {
    const input = parseInput(UpdateSettingsSchema, request.body);
    ok(response, { settings: await updateSettings(request.user!.uid, input) });
  }),
);
