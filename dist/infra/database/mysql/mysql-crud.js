import { CustomError, errMessages } from '@salamandradevs/tools/shared';
import { assertCriteria, assertFindAllFilter, isMySqlDupKeyError } from '../utils.js';
/**
 * MySQL implementation of the backend-neutral {@link ICrud} contract.
 *
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
export class MySqlCrud {
    pool;
    tableName;
    /**
     * Creates a MySQL CRUD adapter for one table.
     *
     * @param pool - MySQL connection pool.
     * @param tableName - Table that stores the records.
     */
    constructor(pool, tableName) {
        this.pool = pool;
        this.tableName = tableName;
    }
    /**
     * Persists one record in MySQL and returns the stored record.
     *
     * @remarks
     * The database may assign an `AUTO_INCREMENT` surrogate `id`, which stays in storage and
     * is never attached to the returned record.
     * @param record - Complete record to store.
     * @returns Stored backend-neutral record without MySQL surrogate `id`.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the insert violates a unique
     *   constraint.
     * @throws {CustomError} DB_BACKEND_ERROR when the insert fails for any other reason.
     */
    async create(record) {
        // Build INSERT with escaped identifiers and placeholders for values.
        const keys = Object.keys(record);
        const columns = keys.map((key) => this.pool.escapeId(key)).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const sql = keys.length
            ? `INSERT INTO ${this.pool.escapeId(this.tableName)} (${columns}) VALUES (${placeholders})`
            : `INSERT INTO ${this.pool.escapeId(this.tableName)} () VALUES ()`;
        // Execute through the pool, binding record values to placeholders.
        try {
            await this.pool.execute(sql, keys.map((key) => record[key]));
        }
        catch (error) {
            if (isMySqlDupKeyError(error)) {
                throw new CustomError({
                    name: 'DB_DUPLICATE_KEY_ERROR',
                    message: errMessages.DB_DUPLICATE_KEY,
                    cause: error
                });
            }
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
                message: 'Failed to create MySQL record',
                cause: error
            });
        }
        return record;
    }
    /**
     * Reads one record matching all criteria fields and returns the match, or null.
     *
     * @param criteria - Record fields and values used for the lookup.
     * @returns Matching backend-neutral record without surrogate `id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    async read(criteria) {
        // Read through the pool without opening a transaction.
        const record = await this.findRecord(this.pool, criteria);
        // Hide the storage id when a record is found.
        return record ? this.returnRecord(record) : null;
    }
    /**
     * Finds records matching all criteria fields and required page controls.
     *
     * @remarks
     * Selects one row beyond `limit` to derive `hasNextPage` without a second count query,
     * then trims the extra row from the returned page.
     * @param criteria - Record fields and values used for the lookup.
     * @param options - Required ordering, cursor, and page-size controls.
     * @returns Matching backend-neutral records (without surrogate `id`) and page metadata.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    async find(criteria, options) {
        assertCriteria(criteria);
        const limit = options.limit;
        const queryLimit = limit + 1;
        const filterSql = this.buildFindFilter(criteria, options.cursor, options.orderBy);
        const sql = `SELECT * FROM ${this.pool.escapeId(this.tableName)} WHERE ${filterSql[0]}` +
            this.buildSort(options.orderBy) +
            ' LIMIT ?';
        const [records] = await this.pool.execute(sql, [...filterSql[1], queryLimit]);
        const hasNextPage = records.length > limit;
        const returnedRecords = hasNextPage
            ? records.slice(0, limit)
            : records;
        return {
            records: returnedRecords.map((record) => this.returnRecord(record)),
            hasNextPage
        };
    }
    /**
     * Returns every record matching the exact criteria and optional range bounds.
     *
     * @remarks
     * Unbounded by default: a numeric `options.limit` caps the result and may truncate it,
     * while `null` reads the full match set. `greaterThan` and `lessThan` are translated to
     * `>` and `<` here, so those operators never cross {@link ICrud}; order is applied only
     * when `options.orderBy` is given, otherwise the backend's natural order stands.
     * @param criteria - Exact field criteria; may be empty when a range bound is given.
     * @param options - Limit, optional order, and optional exclusive range bounds.
     * @returns Every matching backend-neutral record (without surrogate `id`).
     * @throws {TypeError} When no criteria or range bound selects records; see
     *   {@link assertFindAllFilter}.
     */
    async findAll(criteria, options) {
        assertFindAllFilter(criteria, options.greaterThan, options.lessThan);
        const [whereSql, values] = this.buildRangeFilter(criteria, options.greaterThan, options.lessThan);
        const orderSql = options.orderBy ? this.buildSort(options.orderBy) : '';
        const limitSql = options.limit !== null ? ' LIMIT ?' : '';
        const sql = `SELECT * FROM ${this.pool.escapeId(this.tableName)} WHERE ${whereSql}` +
            orderSql +
            limitSql;
        const bindings = options.limit !== null ? [...values, options.limit] : values;
        const [records] = await this.pool.execute(sql, bindings);
        return records.map((record) => this.returnRecord(record));
    }
    /**
     * Updates one record matching all criteria fields and returns the updated record, or
     * null.
     *
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
    async update(criteria, changes) {
        // Reserve one connection for the complete transaction.
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Find and lock the target (forUpdate = true) so it cannot change during the update.
            const storedRecord = await this.findRecord(connection, criteria, true);
            if (!storedRecord) {
                await connection.rollback();
                return null;
            }
            // Build and execute the update using the stable surrogate id.
            const entries = Object.entries(changes);
            if (entries.length) {
                const assignments = entries
                    .map(([field]) => `${connection.escapeId(field)} = ?`)
                    .join(', ');
                const sql = `UPDATE ${connection.escapeId(this.tableName)} SET ${assignments} ` +
                    `WHERE ${connection.escapeId('id')} = ?`;
                await connection.execute(sql, [
                    ...entries.map(([, fieldValue]) => fieldValue),
                    storedRecord.id
                ]);
            }
            // Reload the database result before returning it.
            const sql = `SELECT * FROM ${connection.escapeId(this.tableName)} ` +
                `WHERE ${connection.escapeId('id')} = ? LIMIT 1`;
            const [updatedRecords] = await connection.execute(sql, [storedRecord.id]);
            const updatedRecord = updatedRecords.at(0);
            if (!updatedRecord) {
                throw new Error('Updated MySQL record could not be returned');
            }
            // Persist the transaction and hide the storage id.
            await connection.commit();
            return this.returnRecord(updatedRecord);
        }
        catch (error) {
            // Undo partial work on any failure.
            await connection.rollback();
            if (isMySqlDupKeyError(error)) {
                throw new CustomError({
                    name: 'DB_DUPLICATE_KEY_ERROR',
                    message: errMessages.DB_DUPLICATE_KEY,
                    cause: error
                });
            }
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
                message: 'Failed to update MySQL record',
                cause: error
            });
        }
        finally {
            // Always return the connection to the pool.
            connection.release();
        }
    }
    /**
     * Deletes one record matching all criteria fields and returns the deleted record, or
     * null.
     *
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
    async delete(criteria) {
        // Reserve one connection for the complete transaction.
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Find and lock the exact row to delete.
            const record = await this.findRecord(connection, criteria, true);
            if (!record) {
                await connection.rollback();
                return null;
            }
            // Delete the selected row using its stable surrogate id.
            const sql = `DELETE FROM ${connection.escapeId(this.tableName)} ` +
                `WHERE ${connection.escapeId('id')} = ?`;
            await connection.execute(sql, [record.id]);
            // Persist the transaction and return the deleted application record.
            await connection.commit();
            return this.returnRecord(record);
        }
        catch (error) {
            // Undo partial work on any failure.
            await connection.rollback();
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
                message: 'Failed to delete MySQL record',
                cause: error
            });
        }
        finally {
            // Always return the connection to the pool.
            connection.release();
        }
    }
    /**
     * Finds one stored record matching all criteria fields.
     *
     * @param connection - MySQL connection or pool used for the query.
     * @param criteria - Record fields and values used for the lookup.
     * @param forUpdate - Whether to lock the matching record for update.
     * @returns Matching stored record, or null when not found.
     */
    async findRecord(connection, criteria, forUpdate = false) {
        assertCriteria(criteria);
        const entries = Object.entries(criteria);
        // Build one compound lookup, adding a transaction lock when requested.
        const conditions = [
            ...entries.map(([field, value]) => value === null
                ? `${connection.escapeId(field)} IS NULL`
                : `${connection.escapeId(field)} = ?`)
        ].join(' AND ');
        const sql = `SELECT * FROM ${connection.escapeId(this.tableName)} ` +
            `WHERE ${conditions} LIMIT 1` +
            (forUpdate ? ' FOR UPDATE' : '');
        // Bind non-null lookup values and return only the first match.
        const values = entries
            .filter(([, value]) => value !== null)
            .map(([, value]) => value);
        const [records] = await connection.execute(sql, values);
        return records.at(0) ?? null;
    }
    /**
     * Builds a MySQL WHERE predicate from exact criteria and cursor options.
     *
     * @param criteria - Exact field criteria already owned by the caller policy.
     * @param cursor - Last seen ordered field values used to continue the page.
     * @param orderBy - Ordered fields that define deterministic cursor continuation.
     * @returns SQL predicate text and its bound values.
     */
    buildFindFilter(criteria, cursor, orderBy) {
        const entries = Object.entries(criteria);
        const criteriaConditions = entries.map(([field, value]) => value === null
            ? `${this.pool.escapeId(field)} IS NULL`
            : `${this.pool.escapeId(field)} = ?`);
        const values = entries
            .filter(([, value]) => value !== null)
            .map(([, value]) => value);
        if (!cursor) {
            return [criteriaConditions.join(' AND '), values];
        }
        const cursorValues = [];
        const cursorClauses = orderBy.map((order, index) => {
            const equalityConditions = orderBy
                .slice(0, index)
                .map((previous) => {
                cursorValues.push(cursor[previous.field]);
                return `${this.pool.escapeId(previous.field)} = ?`;
            });
            const comparisonOperator = order.direction === 'asc' ? '>' : '<';
            cursorValues.push(cursor[order.field]);
            return [
                ...equalityConditions,
                `${this.pool.escapeId(order.field)} ${comparisonOperator} ?`
            ].join(' AND ');
        });
        const cursorSql = cursorClauses
            .map((clause) => `(${clause})`)
            .join(' OR ');
        return [
            `${criteriaConditions.join(' AND ')} AND (${cursorSql})`,
            [...values, ...cursorValues]
        ];
    }
    /**
     * Builds a MySQL WHERE predicate from exact criteria and optional exclusive range bounds.
     *
     * @remarks
     * Emits one `= ?` (or `IS NULL`) clause per exact field and one `> ?` / `< ?` clause per
     * bound, joined with `AND`, so a field bounded on both sides is matched between them.
     * Exact criteria and a range on the same field both apply; keep a field in one or the
     * other to avoid a contradictory predicate.
     * @param criteria - Exact field criteria owned by the caller policy.
     * @param greaterThan - Fields with an exclusive lower bound, or undefined.
     * @param lessThan - Fields with an exclusive upper bound, or undefined.
     * @returns SQL predicate text and its bound values.
     */
    buildRangeFilter(criteria, greaterThan, lessThan) {
        const conditions = [];
        const values = [];
        for (const [field, value] of Object.entries(criteria)) {
            if (value === null) {
                conditions.push(`${this.pool.escapeId(field)} IS NULL`);
            }
            else {
                conditions.push(`${this.pool.escapeId(field)} = ?`);
                values.push(value);
            }
        }
        for (const [field, value] of Object.entries(greaterThan ?? {})) {
            conditions.push(`${this.pool.escapeId(field)} > ?`);
            values.push(value);
        }
        for (const [field, value] of Object.entries(lessThan ?? {})) {
            conditions.push(`${this.pool.escapeId(field)} < ?`);
            values.push(value);
        }
        return [conditions.join(' AND '), values];
    }
    /**
     * Builds a MySQL ORDER BY clause from backend-neutral order definitions.
     *
     * @param orderBy - Ordered fields that define the deterministic result order.
     * @returns SQL ORDER BY text.
     */
    buildSort(orderBy) {
        const orderItems = orderBy
            .map((order) => {
            const direction = order.direction === 'asc' ? 'ASC' : 'DESC';
            return `${this.pool.escapeId(order.field)} ${direction}`;
        })
            .join(', ');
        return ` ORDER BY ${orderItems}`;
    }
    /**
     * Removes MySQL storage identity from one returned record.
     *
     * @param record - Full MySQL record including storage-owned surrogate `id`.
     * @returns Backend-neutral record without MySQL surrogate `id`.
     */
    returnRecord(record) {
        // Remove MySQL-owned identity before crossing the adapter boundary.
        const { id: storageId, ...applicationRecord } = record;
        void storageId;
        return applicationRecord;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlzcWwtY3J1ZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9teXNxbC9teXNxbC1jcnVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUt0Rjs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCxNQUFNLE9BQU8sU0FBUztJQVFEO0lBQ0E7SUFSbkI7Ozs7O09BS0c7SUFDSCxZQUNtQixJQUFVLEVBQ1YsU0FBaUI7UUFEakIsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUNWLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFDakMsQ0FBQztJQUVKOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFTO1FBQ3BCLHFFQUFxRTtRQUNyRSxNQUFNLElBQUksR0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE1BQU0sT0FBTyxHQUFXLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sWUFBWSxHQUFXLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVELE1BQU0sR0FBRyxHQUFXLElBQUksQ0FBQyxNQUFNO1lBQzdCLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxPQUFPLGFBQWEsWUFBWSxH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