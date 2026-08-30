import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/app-error.js";
import { parseInput } from "../../shared/validation/validation.js";
import { createPocket, getProjectedPocket, getProjectedPockets, removePocket, updatePocket } from "./savings-pocket.service.js";
import { createPocketSchema, pocketIdSchema, updatePocketSchema } from "./savings-pocket.validation.js";

function userId(request: Request): string {
  if (!request.authenticatedUser) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return request.authenticatedUser.uid;
}

export async function list(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await getProjectedPockets(userId(request)) });
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = parseInput(createPocketSchema, request.body);
  response.status(201).json({ success: true, data: { pocket: await createPocket(userId(request), input) } });
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const id = parseInput(pocketIdSchema, request.params.id);
  response.json({ success: true, data: { pocket: await getProjectedPocket(userId(request), id) } });
}

export async function update(request: Request, response: Response): Promise<void> {
  const id = parseInput(pocketIdSchema, request.params.id);
  const input = parseInput(updatePocketSchema, request.body);
  response.json({ success: true, data: { pocket: await updatePocket(userId(request), id, input) } });
}

export async function remove(request: Request, response: Response): Promise<void> {
  const id = parseInput(pocketIdSchema, request.params.id);
  await removePocket(userId(request), id);
  response.status(204).send();
}
