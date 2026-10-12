import type { IndexDef } from '../infra/database/types.js';

/**
 * Platform index for tenant-scoped record identity lookups and mutations.
 * @remarks
 * The composite `(tenantId, recordId)` key is unique, enforcing one record per identifier
 * within a tenant and backing the tenant-scoped read, update, and delete paths of
 * {@link RecordsHandler}. Its column order also matches the handler's `createdAt`/`recordId`
 * find ordering.
 * @group Storage
 * @category Storage
 */
export const recordIndexDef: IndexDef = {
  name: 'tenant_record',
  fields: [
    { name: 'tenantId', direction: 'asc' },
    { name: 'recordId', direction: 'asc' }
  ],
  unique: true
} as const satisfies IndexDef;
