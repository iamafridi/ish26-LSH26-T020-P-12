/**
 * Input parsing. Every request body and query string goes through here.
 *
 * `parse`, never `cast`: a malformed money string must fail at the edge with a
 * field-level message, not become NaN somewhere in the engine.
 */
import type { z } from "zod";

import { validationError } from "../errors/app-error.js";

export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw validationError(
      "Check the highlighted fields and try again.",
      result.error.flatten().fieldErrors,
    );
  }
  return result.data;
}
