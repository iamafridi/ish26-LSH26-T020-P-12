import type { z } from "zod";

import { AppError } from "../errors/app-error.js";

export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields and try again.", result.error.flatten());
  }
  return result.data;
}
