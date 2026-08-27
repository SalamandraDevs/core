import type { MongoIndexDef } from '../database/mongo/types.js';

/**
 * Platform index for tenant-scoped entity identity lookups and mutations.
 */
export const entityIndexDef: MongoIndexDef = {
  name: 'tenant_entity',
  keys: { tenantId: 1, entityId: 1 },
  options: { unique: true }
} as const satisfies MongoIndexDef;
