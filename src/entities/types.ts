import { z } from 'zod';

import { entityFindCursorSchema, entityFindOptionsSchema } from './schema.js';
import { entitySchema } from './schema.js';

/**
 * Backend-neutral entity metadata shared by every application record.
 */
export type Entity = z.infer<typeof entitySchema>;

/**
 * Entity fields owned by policy and excluded from caller payloads.
 */
export type EntityProtectedKeys = keyof Omit<Entity, 'status'>;

/**
 * Create payload before policy-owned metadata is applied.
 */
export type EntityCreateInput<T extends Entity> = Omit<T, EntityProtectedKeys>;

/**
 * Allowed partial update payload with entity-owned fields forbidden.
 *
 * Optional `never` fields preserve compatibility with `ICrud.update`
 * while rejecting protected keys at compile time.
 */
export type EntityChanges<T extends Entity> = Partial<T> & {
  [K in EntityProtectedKeys]?: never;
};

/**
 * Cursor fields used by tenant-scoped entity collection pagination.
 * - createdAt: Last returned creation timestamp in the current page.
 * - entityId: Last returned entity identifier used as the timestamp tie-breaker.
 */
export type EntityFindCursor = z.infer<typeof entityFindCursorSchema>;

/**
 * Entity collection find options owned by the policy layer.
 * - cursor: Continuation point from the previous entity page, or null for the first page.
 * - limit: Maximum records returned to the caller.
 */
export type EntityFindOptions = z.infer<typeof entityFindOptionsSchema>;
