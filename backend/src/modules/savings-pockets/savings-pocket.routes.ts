import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { create, getOne, list, remove, update } from "./savings-pocket.controller.js";

export const savingsPocketRouter = Router();
savingsPocketRouter.use(authenticate);
savingsPocketRouter.get("/", list);
savingsPocketRouter.post("/", create);
savingsPocketRouter.get("/:id", getOne);
savingsPocketRouter.patch("/:id", update);
savingsPocketRouter.delete("/:id", remove);
