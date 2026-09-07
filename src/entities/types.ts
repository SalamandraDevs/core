import { z } from 'zod';

import { entitySchema } from './schema.js';

/**
 * Backend-neutral entity metadata shared by every application record.
 */
export type Entity = z.infer<typeof entitySchema>;

/**
 * Entity fields owned by policy and excluded from caller payloads.
 */
export type EntityProtectedKeys = keyof Omit<Entity, 'entityName' | 'status'>;

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
