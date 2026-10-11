import { CustomError } from '@salamandradevs/tools/shared';
import type { FieldPacket, Pool, RowDataPacket } from 'mysql2/promise';

import type { IDataset } from '../contracts.js';
import type { IndexDef, IndexField } from '../types.js';
import type { MySqlSchema } from './types.js';

/**
 * MySQL dataset administration adapter.
 *
 * @remarks
 * Inspects `information_schema` for table and index existence and issues DDL to create
 * what is missing, wrapping every driver failure as a `DB_DATASET_ERROR`. Unlike the Mongo
 * adapter, `readIndex` reconstructs the full index definition (fields, direction, and
 * uniqueness) from catalog rows.
 * @group Infra
 * @category Database
 */
export class MySqlDataset implements IDataset<MySqlSchema, IndexDef> {
  /**
   * Creates a MySQL dataset adapter for one connected database.
   *
   * @param pool - Connected MySQL pool.
   */
  constructor(private readonly pool: Pool) {}

  /**
   * Checks whether one table exists.
   *
   * @param name - Table name to inspect.
   * @returns Whether the table exists.
   * @throws {CustomError} DB_DATASET_ERROR when the existence check fails.
   */
  async read(name: string): Promise<boolean> {
    try {
      const [rows]: [RowDataPacket[], FieldPacket[]] = await this.pool.execute<
        RowDataPacket[]
      >(
        'SELECT 1 FROM information_schema.tables ' +
          'WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
        [name]
      );

      return rows.length > 0;
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to read MySQL dataset '${name}'`,
        cause: error
      });
    }
  }

  /**
   * Creates one table with the desired schema.
   *
   * @param name - Table name to reconcile.
   * @param desired - Target schema definition.
   * @returns A promise that resolves when creation completes.
   * @throws {CustomError} DB_DATASET_ERROR when table creation fails.
   */
  async create(name: string, desired: MySqlSchema): Promise<void> {
    try {
      await this.pool.execute(
        `CREATE TABLE ${this.pool.escapeId(name)} (${desired.ddl})`
      );
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to create MySQL dataset '${name}'`,
        cause: error
      });
    }
  }

  /**
   * Reads one index definition for a table and returns it, or null.
   *
   * @remarks
   * Reconstructs the definition from `information_schema.statistics`, ordering fields by
   * `seq_in_index`, mapping the `D` collation to descending, and treating the index as
   * unique only when every catalog row reports `non_unique = 0`.
   * @param datasetName - Table name that owns the index.
   * @param indexName - Index name to inspect.
   * @returns Existing index definition, or null when absent.
   * @throws {CustomError} DB_DATASET_ERROR when reading the index catalog fails.
   */
  async readIndex(datasetName: string, indexName: string): Promise<IndexDef | null> {
    try {
      const [rows]: [RowDataPacket[], FieldPacket[]] = await this.pool.execute<
        RowDataPacket[]
      >(
        'SELECT column_name, collation, non_unique FROM information_schema.statistics ' +
          'WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? ' +
          'ORDER BY seq_in_index ASC',
        [datasetName, indexName]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        name: indexName,
        fields: rows.map((row: RowDataPacket): IndexField => ({
          name: String(row.column_name),
          direction: row.collation === 'D' ? 'desc' : 'asc'
        })),
        unique: rows.every((row: RowDataPacket): boolean => row.non_unique === 0)
      };
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to read index '${indexName}' for MySQL dataset '${datasetName}'`,
        cause: error
      });
    }
  }

  /**
   * Creates one table index.
   *
   * @remarks
   * Skips creation silently when the table is missing any indexed column, since the MySQL
   * schema converter does not yet emit entity columns; the index is created once those
   * columns exist.
   * @param datasetName - Table name that owns the index.
   * @param desired - Target index definition.
   * @returns A promise that resolves when creation completes or is skipped.
   * @throws {CustomError} DB_DATASET_ERROR when index creation fails.
   */
  async createIndex(datasetName: string, desired: IndexDef): Promise<void> {
    try {
      const existingColumns: Set<string> = await this.readColumnNames(datasetName);
      const hasAllColumns: boolean = desired.fields.every((field: IndexField): boolean =>
        existingColumns.has(field.name)
      );

      if (!hasAllColumns) {
        return;
      }

      const uniqueSql: string = desired.unique ? 'UNIQUE ' : '';
      const columnsSql: string = desired.fields
        .map((field: IndexField): string => {
          const direction: 'ASC' | 'DESC' = field.direction === 'asc' ? 'ASC' : 'DESC';

          return `${this.pool.escapeId(field.name)} ${direction}`;
        })
        .join(', ');
      const sql: string =
        `CREATE ${uniqueSql}INDEX ${this.pool.escapeId(desired.name)} ` +
        `ON ${this.pool.escapeId(datasetName)} (${columnsSql})`;

      await this.pool.execute(sql);
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to create index '${desired.name}' for MySQL dataset '${datasetName}'`,
        cause: error
      });
    }
  }

  /**
   * Reads column names for one table.
   *
   * @param datasetName - Table whose columns should be inspected.
   * @returns Set of current column names.
   */
  private async readColumnNames(datasetName: string): Promise<Set<string>> {
    const [rows]: [RowDataPacket[], FieldPacket[]] = await this.pool.execute<
      RowDataPacket[]
    >(
      'SELECT column_name FROM information_schema.columns ' +
        'WHERE table_schema = DATABASE() AND table_name = ?',
      [datasetName]
    );

    return new Set(rows.map((row: RowDataPacket): string => String(row.column_name)));
  }
}
