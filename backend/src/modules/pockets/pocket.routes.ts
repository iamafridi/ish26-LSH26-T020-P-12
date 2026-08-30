import { Router } from "express";

import {
  CreatePocketSchema,
  UpdatePocketSchema,
  createPocket,
  deletePocket,
  listPockets,
  updatePocket,
} from "./pocket.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { handle, ok } from "../../shared/http/respond.js";
import { parseInput } from "../../shared/validation/validation.js";

export const pocketRouter = Router();

pocketRouter.use(authenticate);

pocketRouter.get(
  "/",
  handle(async (request, response) => {
    ok(response, { pockets: await listPockets(request.user!.uid) });
  }),
);

pocketRouter.post(
  "/",
  handle(async (request, response) => {
    const input = parseInput(CreatePocketSchema, request.body);
    ok(response, { pocket: await createPocket(request.user!.uid, input) }, 201);
  }),
);

pocketRouter.patch(
  "/:id",
  handle(async (request, response) => {
    const input = parseInput(UpdatePocketSchema, request.body);
    ok(response, { pocket: await updatePocket(request.user!.uid, String(request.params["id"]), input) });
  }),
);

pocketRouter.delete(
  "/:id",
  handle(async (request, response) => {
    await deletePocket(request.user!.uid, String(request.params["id"]));
    ok(response, { deleted: true });
  }),
);
