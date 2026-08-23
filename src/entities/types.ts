import { z } from 'zod';

import { entitySchema } from './schema.js';

/**
 * Backend-neutral entity metadata shared by every application record.
 */
export type Entity = z.infer<typeof entitySchema>;

/**
 * Entity fields that entity policy owns and must not change through generic updates.
 */
export type ProtectedEntityKeys = 'tenantId' | 'entityId' | 'createdAt' | 'createdBy';

/**
 * Allowed partial update payload with entity-owned fields forbidden.
 *
 * Optional `never` fields preserve compatibility with `ICrud.update`
 * while rejecting protected keys at compile time.
 */
export type EntityChanges<T extends Entity> = Partial<T> & {
  [K in ProtectedEntityKeys]?: never;
};

/**
 * Create payload before policy-owned identity and tenant metadata are applied.
 */
export type EntityCreateInput<T extends Entity> = Omit<T, 'tenantId' | 'entityId'>;
