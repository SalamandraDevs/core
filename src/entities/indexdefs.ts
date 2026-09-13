import type { IndexDef } from '../database/types.js';

/**
 * Platform index for tenant-scoped entity identity lookups and mutations.
 */
export const entityIndexDef: IndexDef = {
  name: 'tenant_entity',
  fields: [
    { name: 'tenantId', direction: 'asc' },
    { name: 'entityId', direction: 'asc' }
  ],
  unique: true
} as const satisfies IndexDef;
