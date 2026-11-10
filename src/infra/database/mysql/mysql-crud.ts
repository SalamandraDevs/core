import { CustomError, errMessages } from '@salamandradevs/tools/shared';
import type { Connection, ExecuteValues, FieldPacket, Pool } from 'mysql2/promise';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { assertCriteria, assertFindAllFilter, isMySqlDupKeyError } from '../utils.js';
import type { ICrud } from '../contracts.js';
import type { FindAllOptions, FindOptions, FindOrder, FindResult } from '../types.js';
import type { GeneralRecord } from '../types.js';

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
export class MySqlCrud<T extends GeneralRecord> implements ICrud<T> {
  /**
   * Creates a MySQL CRUD adapter for one table.
   *
   * @param pool - MySQL connection pool.
   * @param tableName - Table that stores the records.
   */
  constructor(
    private readonly pool: Pool,
    private readonly tableName: string
  ) {}

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
  async create(record: T): Promise<T> {
    // Build INSERT with escaped identifiers and placeholders for values.
    const keys: string[] = Object.keys(record);
    const columns: string = keys.map((key: string) => this.pool.escapeId(key)).join(', ');
    const placeholders: string = keys.map(() => '?').join(', ');
    const sql: string = keys.length
      ? `INSERT INTO ${this.pool.escapeId(this.tableName)} (${columns}) VALUES (${placeholders})`
      : `INSERT INTO ${this.pool.escapeId(this.tableName)} () VALUES ()`;

    // Execute through the pool, binding record values to placeholders.
    try {
      await this.pool.execute<ResultSetHeader>(
        sql,
        keys.map((key: string) => record[key] as ExecuteValues)
      );
    } catch (error: unknown) {
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
  async read(criteria: Partial<T>): Promise<T | null> {
    // Read through the pool without opening a transaction.
    const record: RowDataPacket | null = await this.findRecord(this.pool, criteria);

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
  async find(criteria: Partial<T>, options: FindOptions<T>): Promise<FindResult<T>> {
    assertCriteria(criteria);
    const limit: number = options.limit;
    const queryLimit: number = limit + 1;

    const filterSql: [string, ExecuteValues[]] = this.buildFindFilter(
      criteria,
      options.cursor,
      options.orderBy
    );
    const sql: string =
      `SELECT * FROM ${this.pool.escapeId(this.tableName)} WHERE ${filterSql[0]}` +
      this.buildSort(options.orderBy) +
      ' LIMIT ?';

    const [records]: [RowDataPacket[], FieldPacket[]] = await this.pool.execute<
      RowDataPacket[]
    >(sql, [...filterSql[1], queryLimit]);
    const hasNextPage: boolean = records.length > limit;
    const returnedRecords: RowDataPacket[] = hasNextPage
      ? records.slice(0, limit)
      : records;

    return {
      records: returnedRecords.map((record: RowDataPacket) => this.returnRecord(record)),
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
  async findAll(criteria: Partial<T>, options: FindAllOptions<T>): Promise<readonly T[]> {
    // criteria, greaterThan, or lessThan must select records
    assertFindAllFilter(criteria, options.greaterThan, options.lessThan);
    const [whereSql, values]: [string, ExecuteValues[]] = this.buildRangeFilter(
      criteria,
      options.greaterThan,
      options.lessThan
    );

    // A null limit reads the full match set; a number appends ` LIMIT ?` and may truncate.
    const orderSql: string = options.orderBy ? this.buildSort(options.orderBy) : '';
    const limitSql: string = options.limit !== null ? ' LIMIT ?' : '';
    const sql: string =
      `SELECT * FROM ${this.pool.escapeId(this.tableName)} WHERE ${whereSql}` +
      orderSql +
      limitSql;

    // Bind the LIMIT value after the WHERE values so it lines up with the trailing `?`.
    const bindings: ExecuteValues[] =
      options.limit !== null ? [...values, options.limit] : values;
    const [records]: [RowDataPacket[], FieldPacket[]] = await this.pool.execute<
      RowDataPacket[]
    >(sql, bindings);

    return records.map((record: RowDataPacket) => this.returnRecord(record));
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
  async update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null> {
    // Reserve one connection for the complete transaction.
    const connection: PoolConnection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find and lock the target (forUpdate = true) so it cannot change during the update.
      const storedRecord: RowDataPacket | null = await this.findRecord(
        connection,
        criteria,
        true
      );

      if (!storedRecord) {
        await connection.rollback();
        return null;
      }

      // Build and execute the update using the stable surrogate id.
      const entries: [string, ExecuteValues][] = Object.entries(changes);

      if (entries.length) {
        const assignments: string = entries
          .map(([field]: [string, ExecuteValues]) => `${connection.escapeId(field)} = ?`)
          .join(', ');

        const sql: string =
          `UPDATE ${connection.escapeId(this.tableName)} SET ${assignments} ` +
          `WHERE ${connection.escapeId('id')} = ?`;

        await connection.execute<ResultSetHeader>(sql, [
          ...entries.map(([, fieldValue]: [string, ExecuteValues]) => fieldValue),
          storedRecord.id
        ]);
      }

      // Reload the database result before returning it.
      const sql: string =
        `SELECT * FROM ${connection.escapeId(this.tableName)} ` +
        `WHERE ${connection.escapeId('id')} = ? LIMIT 1`;
      const [updatedRecords]: [RowDataPacket[], FieldPacket[]] = await connection.execute<
        RowDataPacket[]
      >(sql, [storedRecord.id]);

      const updatedRecord: RowDataPacket | undefined = updatedRecords.at(0);

      if (!updatedRecord) {
        throw new Error('Updated MySQL record could not be returned');
      }

      // Persist the transaction and hide the storage id.
      await connection.commit();

      return this.returnRecord(updatedRecord);
    } catch (error: unknown) {
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
    } finally {
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
  async delete(criteria: Partial<T>): Promise<T | null> {
    // Reserve one connection for the complete transaction.
    const connection: PoolConnection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find and lock the exact row to delete.
      const record: RowDataPacket | null = await this.findRecord(
        connection,
        criteria,
        true
      );

      if (!record) {
        await connection.rollback();
        return null;
      }

      // Delete the selected row using its stable surrogate id.
      const sql: string =
        `DELETE FROM ${connection.escapeId(this.tableName)} ` +
        `WHERE ${connection.escapeId('id')} = ?`;

      await connection.execute<ResultSetHeader>(sql, [record.id]);

      // Persist the transaction and return the deleted application record.
      await connection.commit();
      return this.returnRecord(record);
    } catch (error: unknown) {
      // Undo partial work on any failure.
      await connection.rollback();
      throw new CustomError({
        name: 'DB_BACKEND_ERROR',
        message: 'Failed to delete MySQL record',
        cause: error
      });
    } finally {
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
  private async findRecord(
    connection: Connection,
    criteria: Partial<T>,
    forUpdate: boolean = false
  ): Promise<RowDataPacket | null> {
    assertCriteria(criteria);
    const entries: [string, unknown][] = Object.entries(criteria);

    // Build one compound lookup, adding a transaction lock when requested.
    const conditions: string = [
      ...entries.map(([field, value]: [string, unknown]) =>
        value === null
          ? `${connection.escapeId(field)} IS NULL`
          : `${connection.escapeId(field)} = ?`
      )
    ].join(' AND ');
    const sql: string =
      `SELECT * FROM ${connection.escapeId(this.tableName)} ` +
      `WHERE ${conditions} LIMIT 1` +
      (forUpdate ? ' FOR UPDATE' : '');

    // Bind non-null lookup values and return only the first match.
    const values: ExecuteValues[] = entries
      .filter(([, value]: [string, unknown]) => value !== null)
      .map(([, value]: [string, unknown]) => value as ExecuteValues);
    const [records]: [RowDataPacket[], FieldPacket[]] = await connection.execute<
      RowDataPacket[]
    >(sql, values);

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
  private buildFindFilter(
    criteria: Partial<T>,
    cursor: Partial<T> | null,
    orderBy: readonly FindOrder[]
  ): [string, ExecuteValues[]] {
    const entries: [string, unknown][] = Object.entries(criteria);
    const criteriaConditions: string[] = entries.map(
      ([field, value]: [string, unknown]) =>
        value === null
          ? `${this.pool.escapeId(field)} IS NULL`
          : `${this.pool.escapeId(field)} = ?`
    );
    const values: ExecuteValues[] = entries
      .filter(([, value]: [string, unknown]) => value !== null)
      .map(([, value]: [string, unknown]) => value as ExecuteValues);

    if (!cursor) {
      return [criteriaConditions.join(' AND '), values];
    }

    const cursorValues: ExecuteValues[] = [];
    const cursorClauses: string[] = orderBy.map(
      (order: FindOrder, index: number): string => {
        const equalityConditions: string[] = orderBy
          .slice(0, index)
          .map((previous: FindOrder): string => {
            cursorValues.push(cursor[previous.field] as ExecuteValues);

            return `${this.pool.escapeId(previous.field)} = ?`;
          });
        const comparisonOperator: '>' | '<' = order.direction === 'asc' ? '>' : '<';
        cursorValues.push(cursor[order.field] as ExecuteValues);

        return [
          ...equalityConditions,
          `${this.pool.escapeId(order.field)} ${comparisonOperator} ?`
        ].join(' AND ');
      }
    );
    const cursorSql: string = cursorClauses
      .map((clause: string): string => `(${clause})`)
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
  private buildRangeFilter(
    criteria: Partial<T>,
    greaterThan: Partial<T> | undefined,
    lessThan: Partial<T> | undefined
  ): [string, ExecuteValues[]] {
    const conditions: string[] = [];
    const values: ExecuteValues[] = [];

    for (const [field, value] of Object.entries(criteria)) {
      if (value === null) {
        conditions.push(`${this.pool.escapeId(field)} IS NULL`);
      } else {
        conditions.push(`${this.pool.escapeId(field)} = ?`);
        values.push(value as ExecuteValues);
      }
    }

    for (const [field, value] of Object.entries(greaterThan ?? {})) {
      conditions.push(`${this.pool.escapeId(field)} > ?`);
      values.push(value as ExecuteValues);
    }

    for (const [field, value] of Object.entries(lessThan ?? {})) {
      conditions.push(`${this.pool.escapeId(field)} < ?`);
      values.push(value as ExecuteValues);
    }

    return [conditions.join(' AND '), values];
  }

  /**
   * Builds a MySQL ORDER BY clause from backend-neutral order definitions.
   *
   * @param orderBy - Ordered fields that define the deterministic result order.
   * @returns SQL ORDER BY text.
   */
  private buildSort(orderBy: readonly FindOrder[]): string {
    const orderItems: string = orderBy
      .map((order: FindOrder): string => {
        const direction: 'ASC' | 'DESC' = order.direction === 'asc' ? 'ASC' : 'DESC';

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
  private returnRecord(record: RowDataPacket): T {
    // Remove MySQL-owned identity before crossing the adapter boundary.
    const { id: storageId, ...applicationRecord } = record;
    void storageId;

    return applicationRecord as unknown as T;
  }
}
