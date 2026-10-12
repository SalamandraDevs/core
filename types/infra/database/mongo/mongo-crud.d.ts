import type { Collection } from 'mongodb';
import type { ICrud } from '../contracts.js';
import type { FindOptions, FindResult } from '../types.js';
import type { GeneralRecord } from '../types.js';
/**
 * MongoDB implementation of the backend-neutral {@link ICrud} contract.
 * @remarks
 * Criteria are not verified as unique: the single-record operations act on the first match,
 * so the record layer (for example {@link RecordsHandler}) must target fields backed by a
 * unique index when deterministic addressing is required. Every returned record is stripped
 * of the storage-owned `_id`, keeping the surface backend-neutral, and `find` implements
 * keyset pagination over the requested order. Duplicate-key violations are re-classified as
 * `DB_DUPLICATE_KEY_ERROR`; other driver failures become `DB_BACKEND_ERROR`.
 * @group Infra
 * @category Database
 * @template T - Record shape stored in the collection.
 */
export declare class MongoCrud<T extends GeneralRecord> implements ICrud<T> {
    private readonly collection;
    /**
     * Creates a Mongo CRUD adapter for one collection.
     * @param collection - Mongo collection that stores the records.
     */
    constructor(collection: Collection<T>);
    /**
     * Persists one record in MongoDB and returns the stored record.
     * @remarks
     * The driver assigns the storage-owned `_id` to a spread copy, so it never leaks back
     * onto the caller's record instance.
     * @param record - Complete record to store.
     * @returns Stored backend-neutral record without MongoDB `_id`.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the insert violates a unique index.
     * @throws {CustomError} DB_BACKEND_ERROR when the insert fails for any other reason.
     */
    create(record: T): Promise<T>;
    /**
     * Reads one record matching all criteria fields and returns the match, or null.
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @returns Matching backend-neutral record without Mongo `_id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    read(criteria: Partial<T>): Promise<T | null>;
    /**
     * Updates one record matching all criteria fields and returns the updated record, or
     * null.
     * @remarks
     * Applies `changes` with `$set` and returns the post-update document, so the caller
     * observes the persisted state rather than its requested changes.
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @param changes - Partial record with fields to update.
     * @returns Updated backend-neutral record without Mongo `_id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the update violates a unique index.
     * @throws {CustomError} DB_BACKEND_ERROR when the update fails for any other reason.
     */
    update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null>;
    /**
     * Deletes one record matching all criteria fields and returns the deleted record, or
     * null.
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @returns Deleted backend-neutral record without Mongo `_id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    delete(criteria: Partial<T>): Promise<T | null>;
    /**
     * Finds records matching all criteria fields and optional page controls.
     * @remarks
     * Over-fetches one row beyond `limit` to compute `hasNextPage` without a second count
     * query, then drops the extra row from the returned page.
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @param options - Required cursor and page-size controls.
     * @returns Matching backend-neutral records (without `_id`) and page metadata.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    find(criteria: Partial<T>, options: FindOptions<T>): Promise<FindResult<T>>;
    /**
     * Builds a MongoDB filter from backend-neutral exact criteria and cursor options.
     * @param criteria - Exact field criteria already owned by the caller policy.
     * @param cursor - Last seen ordered field values used to continue the page.
     * @param orderBy - Ordered fields that define deterministic cursor continuation.
     * @returns MongoDB filter translated from the backend-neutral find inputs.
     */
    private buildFindFilter;
    /**
     * Builds a MongoDB sort document from backend-neutral ordered fields.
     * @param orderBy - Ordered fields that define deterministic result order.
     * @returns MongoDB sort document.
     */
    private buildSort;
    /**
     * Removes MongoDB storage identity from one returned document.
     * @param document - Full MongoDB document including storage-owned `_id`.
     * @returns Backend-neutral record without MongoDB `_id`.
     */
    private returnRecord;
}
//# sourceMappingURL=mongo-crud.d.ts.map