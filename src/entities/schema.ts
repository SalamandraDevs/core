import { z } from 'zod';

/**
 * Shared Zod schema for backend-neutral entity metadata.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- schema shape is defined by z.object
export const entitySchema = z
  .object({
    tenantId: z.string().min(1),
    entityId: z.uuid(),
    entityName: z.string().min(1),
    status: z.string().min(1),
    createdAt: z.date(),
    createdBy: z.string().min(1),
    updatedAt: z.date(),
    updatedBy: z.string().min(1)
  })
  .strict();

/**
 * Shared Zod schema for entity collection cursor pagination.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- schema shape is defined by z.object
export const entityFindCursorSchema = z
  .object({
    createdAt: z.coerce.date(), // INFO: coerce accept non-iso string dates.
    entityId: z.uuid()
  })
  .strict();

/**
 * Shared Zod schema for entity collection find options.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- schema shape is defined by z.object
export const entityFindOptionsSchema = z
  .object({
    cursor: entityFindCursorSchema.nullable(),
    limit: z.number().int().positive()
  })
  .strict();
