import type { Pool } from 'mysql2/promise';
import type { IDataset } from '../contracts.js';
import type { IndexDef } from '../types.js';
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
export declare class MySqlDataset implements IDataset<MySqlSchema, IndexDef> {
    private readonly pool;
    /**
     * Creates a MySQL dataset adapter for one connected database.
     *
     * @param pool - Connected MySQL pool.
     */
    constructor(pool: Pool);
    /**
     * Checks whether one table exists.
     *
     * @param name - Table name to inspect.
     * @returns Whether the table exists.
     * @throws {CustomError} DB_DATASET_ERROR when the existence check fails.
     */
    read(name: string): Promise<boolean>;
    /**
     * Creates one table with the desired schema.
     *
     * @param name - Table name to reconcile.
     * @param desired - Target schema definition.
     * @returns A promise that resolves when creation completes.
     * @throws {CustomError} DB_DATASET_ERROR when table creation fails.
     */
    create(name: string, desired: MySqlSchema): Promise<void>;
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
    readIndex(datasetName: string, indexName: string): Promise<IndexDef | null>;
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
    createIndex(datasetName: string, desired: IndexDef): Promise<void>;
    /**
     * Reads column names for one table.
     *
     * @param datasetName - Table whose columns should be inspected.
     * @returns Set of current column names.
     */
    private readColumnNames;
}
//# sourceMappingURL=mysql-dataset.d.ts.map