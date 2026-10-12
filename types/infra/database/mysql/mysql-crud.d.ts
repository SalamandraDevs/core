import type { Pool } from 'mysql2/promise';
import type { ICrud } from '../contracts.js';
import type { FindOptions, FindResult } from '../types.js';
import type { GeneralRecord } from '../types.js';
/**
 * MySQL implementation of the backend-neutral {@link ICrud} contract.
 * @remarks
 * Criteria are not verified as unique: operations act on the first match, so the record
 * layer (for example {@link RecordsHandler}) must target fields backed by a unique
 * constraint when deterministic addressing is required. Statements bind values through
 * placeholders and escape identifiers, so criteria and column names cannot inject SQL.
 * `update` and `delete` run in a transaction that locks the target row with `FOR UPDATE`
 * and then mutates it by its stable surrogate `id`, which is stripped from every returned
 * record. Duplicate-key violations are re-classified as `DB_DUPLICATE_KEY_ERROR`; other
 * driver failures become `DB_BACKEND_ERROR`.
 * @group Infra
 * @category Database
 * @template T - Record shape stored in the table.
 */
export declare class MySqlCrud<T extends GeneralRecord> implements ICrud<T> {
    private readonly pool;
    private readonly tableName;
    /**
     * Creates a MySQL CRUD adapter for one table.
     * @param pool - MySQL connection pool.
     * @param tableName - Table that stores the records.
     */
    constructor(pool: Pool, tableName: string);
    /**
     * Persists one record in MySQL and returns the stored record.
     * @remarks
     * The database may assign an `AUTO_INCREMENT` surrogate `id`, which stays in storage and
     * is never attached to the returned record.
     * @param record - Complete record to store.
     * @returns Stored backend-neutral record without MySQL surrogate `id`.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the insert violates a unique
     *   constraint.
     * @throws {CustomError} DB_BACKEND_ERROR when the insert fails for any other reason.
     */
    create(record: T): Promise<T>;
    /**
     * Reads one record matching all criteria fields and returns the match, or null.
     * @param criteria - Record fields and values used for the lookup.
     * @returns Matching backend-neutral record without surrogate `id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    read(criteria: Partial<T>): Promise<T | null>;
    /**
     * Finds records matching all criteria fields and required page controls.
     * @remarks
     * Selects one row beyond `limit` to derive `hasNextPage` without a second count query,
     * then trims the extra row from the returned page.
     * @param criteria - Record fields and values used for the lookup.
     * @param options - Required ordering, cursor, and page-size controls.
     * @returns Matching backend-neutral records (without surrogate `id`) and page metadata.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    find(criteria: Partial<T>, options: FindOptions<T>): Promise<FindResult<T>>;
    /**
     * Updates one record matching all criteria fields and returns the updated record, or
     * null.
     * @remarks
     * Runs in a transaction: it locks the matching row with `FOR UPDATE`, applies `changes`
     * by the row's surrogate `id`, then reloads and returns the persisted row so the caller
     * observes the committed state. Any failure rolls back and the pooled connection is
     * always released.
     * @param criteria - Record fields and values used for the lookup.
     * @param changes - Partial record with fields to update.
     * @returns Updated backend-neutral record without surrogate `id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the update violates a unique
     *   constraint.
     * @throws {CustomError} DB_BACKEND_ERROR when the update fails for any other reason.
     */
    update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null>;
    /**
     * Deletes one record matching all criteria fields and returns the deleted record, or
     * null.
     * @remarks
     * Runs in a transaction: it locks the matching row with `FOR UPDATE`, deletes it by its
     * surrogate `id`, and returns the row as it existed before deletion. Any failure rolls
     * back and the pooled connection is always released.
     * @param criteria - Record fields and values used for the lookup.
     * @returns Deleted backend-neutral record without surrogate `id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     * @throws {CustomError} DB_BACKEND_ERROR when the delete fails.
     */
    delete(criteria: Partial<T>): Promise<T | null>;
    /**
     * Finds one stored record matching all criteria fields.
     * @param connection - MySQL connection or pool used for the query.
     * @param criteria - Record fields and values used for the lookup.
     * @param forUpdate - Whether to lock the matching record for update.
     * @returns Matching stored record, or null when not found.
     */
    private findRecord;
    /**
     * Builds a MySQL WHERE predicate from exact criteria and cursor options.
     * @param criteria - Exact field criteria already owned by the caller policy.
     * @param cursor - Last seen ordered field values used to continue the page.
     * @param orderBy - Ordered fields that define deterministic cursor continuation.
     * @returns SQL predicate text and its bound values.
     */
    private buildFindFilter;
    /**
     * Builds a MySQL ORDER BY clause from backend-neutral order definitions.
     * @param orderBy - Ordered fields that define the deterministic result order.
     * @returns SQL ORDER BY text.
     */
    private buildSort;
    /**
     * Removes MySQL storage identity from one returned record.
     * @param record - Full MySQL record including storage-owned surrogate `id`.
     * @returns Backend-neutral record without MySQL surrogate `id`.
     */
    private returnRecord;
}
//# sourceMappingURL=mysql-crud.d.ts.map