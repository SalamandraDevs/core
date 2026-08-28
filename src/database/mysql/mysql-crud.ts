import type { Connection, ExecuteValues, FieldPacket, Pool } from 'mysql2/promise';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import {
  assertCriteria,
  DUPLICATE_KEY_ERROR_MESSAGE,
  isMySqlDupKeyError
} from '../utils.js';
import type { ICrud } from '../base/contracts.js';
import type { GeneralRecord } from '../types.js';

/**
 * MySQL implementation of the backend-neutral CRUD contract.
 *
 * Criteria are not verified as unique. Policy layer (e.g. Entities class) must use fields
 * backed by appropriate unique constraints when deterministic targeting is required.
 */
export class MySqlCrud<T extends GeneralRecord> implements ICrud<T> {
  /**
   * Creates a MySQL CRUD adapter for one table.
   * @param pool - MySQL connection pool.
   * @param tableName - Table that stores the entity records.
   */
  constructor(
    private readonly pool: Pool,
    private readonly tableName: string
  ) {}

  /**
   * Persists one record in MySQL and returns the stored record.
   * Database AUTO_INCREMENT may assign storage-owned `id` without leaking it to the caller.
   * @param record - Complete record to store.
   * @returns - Stored backend-neutral record without MySQL surrogate `id`.
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
        throw new Error(DUPLICATE_KEY_ERROR_MESSAGE, { cause: error });
      }

      throw error;
    }

    return record;
  }

  /**
   * Reads one record matching all criteria fields and returns the match, or null.
   * Returns the full stored record without MySQL surrogate `id`; null only when not found.
   * @param criteria - Record fields and values used for the lookup.
   * @returns - Matching backend-neutral record, or null when not found.
   */
  async read(criteria: Partial<T>): Promise<T | null> {
    // Read through the pool without opening a transaction.
    const record: RowDataPacket | null = await this.findRecord(this.pool, criteria);

    // Hide the storage id when a record is found.
    return record ? this.returnRecord(record) : null;
  }

  /**
   * Updates one record matching all criteria fields and returns the updated record, or null.
   * Returns the full stored record without MySQL surrogate `id`; null only when not found.
   * @param criteria - Record fields and values used for the lookup.
   * @param changes - Partial record with fields to update.
   * @returns - Updated backend-neutral record, or null when not found.
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
        throw new Error(DUPLICATE_KEY_ERROR_MESSAGE, { cause: error });
      }

      throw error;
    } finally {
      // Always return the connection to the pool.
      connection.release();
    }
  }

  /**
   * Deletes one record matching all criteria fields and returns the deleted record, or null.
   * Returns the full stored record without MySQL surrogate `id`; null only when not found.
   * @param criteria - Record fields and values used for the lookup.
   * @returns - Deleted backend-neutral record, or null when not found.
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
      throw error;
    } finally {
      // Always return the connection to the pool.
      connection.release();
    }
  }

  /**
   * Finds one stored record matching all criteria fields.
   * @param connection - MySQL connection or pool used for the query.
   * @param criteria - Record fields and values used for the lookup.
   * @param forUpdate - Whether to lock the matching record for update.
   * @returns - Matching stored record, or null when not found.
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
   * Removes MySQL storage identity from one returned record.
   * @param record - Full MySQL record including storage-owned surrogate `id`.
   * @returns - Backend-neutral record without MySQL surrogate `id`.
   */
  private returnRecord(record: RowDataPacket): T {
    // Remove MySQL-owned identity before crossing the adapter boundary.
    const { id: storageId, ...applicationRecord } = record;
    void storageId;

    return applicationRecord as unknown as T;
  }
}
