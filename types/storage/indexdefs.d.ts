import type { IndexDef } from '../infra/database/types.js';
/**
 * Platform index for tenant-scoped record identity lookups and mutations.
 *
 * @remarks
 * The composite `(tenantId, recordId)` key is unique, enforcing one record per identifier
 * within a tenant and backing the tenant-scoped read, update, and delete paths of
 * {@link RecordsHandler}. Its column order also matches the handler's `createdAt`/`recordId`
 * find ordering.
 * @group Storage
 * @category Storage
 */
export declare const recordIndexDef: IndexDef;
//# sourceMappingURL=indexdefs.d.ts.map