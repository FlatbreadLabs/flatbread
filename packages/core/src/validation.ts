import { z } from 'zod';
import type { AnyContentNode } from './types';

/**
 * A minimal schema every content node must satisfy.
 * Flatbread only *requires* an `id`; all other fields are user-defined.
 *
 * Transformer plugins should extend this schema with their own shape via
 * `createNodeSchema()` so we preserve a single source of truth for node
 * validation while keeping the door open for arbitrary data.
 */
export const BaseNodeSchema = z
  .object({
    id: z.union([z.string(), z.number()]), // required identifier
  })
  .passthrough(); // allow arbitrary additional fields

export type BaseNode = z.infer<typeof BaseNodeSchema>;

export interface ContentValidationSuccess<T> {
  success: true;
  data: T;
}
export interface ContentValidationFailure {
  success: false;
  error: z.ZodError;
}
export type ContentValidationResult<T> =
  | ContentValidationSuccess<T>
  | ContentValidationFailure;

export const isBaseNode = (n: unknown): n is BaseNode =>
  BaseNodeSchema.safeParse(n).success;

/**
 * Validate content against a provided Zod schema (extend BaseNodeSchema).
 */
export function validateContent<T extends AnyContentNode>(
  content: unknown,
  schema: z.ZodSchema<T>
): ContentValidationResult<T> {
  const parsed = schema.safeParse(content);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, error: parsed.error };
}

/**
 * Convenience: create a node schema by extending BaseNodeSchema with extra fields.
 */
export const createNodeSchema = <Shape extends z.ZodRawShape>(shape: Shape) =>
  BaseNodeSchema.extend(shape);
