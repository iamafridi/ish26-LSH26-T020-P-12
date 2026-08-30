import { Router } from "express";
import { z } from "zod";

import { clearUser, listCases, seedCase } from "./demo.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { parseInput } from "../../shared/validation/validation.js";

const SeedSchema = z.object({
  case_id: z.string().trim().regex(/^PUB-\d{2}$/, "Case ids look like PUB-01."),
});

export const demoRouter = Router();

demoRouter.use(authenticate);

/** The 25 published cases, as a summary the client can offer in a list. */
demoRouter.get(
  "/cases",
  handle(async (_request, response) => {
    ok(response, { cases: listCases() });
  }),
);

/** Load one case into the signed-in user's own account. */
demoRouter.post(
  "/seed",
  handle(async (request, response) => {
    const { case_id } = parseInput(SeedSchema, request.body);
    ok(response, { seeded: await seedCase(request.user!.uid, case_id) });
  }),
);

demoRouter.delete(
  "/",
  handle(async (request, response) => {
    await clearUser(request.user!.uid);
    ok(response, { cleared: true });
  }),
);
