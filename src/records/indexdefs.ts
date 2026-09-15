import type { IndexDef } from '../database/types.js';

/**
 * Platform index for tenant-scoped record identity lookups and mutations.
 */
export const recordIndexDef: IndexDef = {
  name: 'tenant_record',
  fields: [
    { name: 'tenantId', direction: 'asc' },
    { name: 'recordId', direction: 'asc' }
  ],
  unique: true
} as const satisfies IndexDef;
