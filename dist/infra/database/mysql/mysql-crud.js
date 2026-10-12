import { CustomError, errMessages } from '@salamandradevs/tools/shared';
import { assertCriteria, isMySqlDupKeyError } from '../utils.js';
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
export class MySqlCrud {
    pool;
    tableName;
    /**
     * Creates a MySQL CRUD adapter for one table.
     * @param pool - MySQL connection pool.
     * @param tableName - Table that stores the records.
     */
    constructor(pool, tableName) {
        this.pool = pool;
        this.tableName = tableName;
    }
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
     * Builds a MySQL ORDER BY clause from backend-neutral order definitions.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlzcWwtY3J1ZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9teXNxbC9teXNxbC1jcnVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUtqRTs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILE1BQU0sT0FBTyxTQUFTO0lBT0Q7SUFDQTtJQVBuQjs7OztPQUlHO0lBQ0gsWUFDbUIsSUFBVSxFQUNWLFNBQWlCO1FBRGpCLFNBQUksR0FBSixJQUFJLENBQU07UUFDVixjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQ2pDLENBQUM7SUFFSjs7Ozs7Ozs7OztPQVVHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFTO1FBQ3BCLHFFQUFxRTtRQUNyRSxNQUFNLElBQUksR0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE1BQU0sT0FBTyxHQUFXLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sWUFBWSxHQUFXLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVELE1BQU0sR0FBRyxHQUFXLElBQUksQ0FBQyxNQUFNO1lBQzdCLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxPQUFPLGFBQWEsWUFBWSxHQUFHO1lBQzNGLENBQUMs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