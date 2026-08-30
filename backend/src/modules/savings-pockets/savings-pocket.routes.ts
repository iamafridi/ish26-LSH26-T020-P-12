import { Router } from "express";

import { authenticate } from "../../shared/middleware/authenticate.js";
import { ensureDatabaseConnection } from "../../shared/middleware/database-connection.js";
import { create, getOne, list, remove, update } from "./savings-pocket.controller.js";

export const savingsPocketRouter = Router();
savingsPocketRouter.use(authenticate, ensureDatabaseConnection);
savingsPocketRouter.get("/", list);
savingsPocketRouter.post("/", create);
savingsPocketRouter.get("/:id", getOne);
savingsPocketRouter.patch("/:id", update);
savingsPocketRouter.delete("/:id", remove);
