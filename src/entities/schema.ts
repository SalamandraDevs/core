import { z } from 'zod';

/**
 * Shared Zod schema for backend-neutral entity metadata.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- schema shape is defined by z.object
export const entitySchema = z
  .object({
    tenantId: z.string().min(1),
    entityId: z.uuid(),
    version: z.number().int().min(1),
    createdAt: z.date(),
    createdBy: z.string().min(1),
    updatedAt: z.date(),
    updatedBy: z.string().min(1),
    deletedAt: z.union([z.date(), z.null()])
  })
  .strict();
