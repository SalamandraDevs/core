import type { IDataset } from '../contracts.js';

/**
 * MySQL index definition used during dataset provisioning.
 */
export type MySqlIndexDef = {
  name: string;
  columns: readonly string[];
};

/**
 * MySQL schema definition produced from Zod conversion.
 */
export type MySqlSchema = {
  ddl: string;
};

/**
 * MySQL dataset administration adapter.
 */
export class MySqlDataset implements IDataset<MySqlSchema, MySqlIndexDef> {
  /**
   * Checks whether one table exists.
   * @param name - Table name to inspect.
   */
  read(name: string): Promise<boolean> {
    void name;
    throw new Error('ponytail: scaffold only; implement read later');
  }

  /**
   * Creates one table with the desired schema.
   * @param name - Table name to reconcile.
   * @param desired - Target schema definition.
   */
  create(name: string, desired: MySqlSchema): Promise<void> {
    void name;
    void desired;
    throw new Error('ponytail: scaffold only; implement create later');
  }

  /**
   * Reads one index definition for a table and returns it, or null.
   * @param datasetName - Table name that owns the index.
   * @param indexName - Index name to inspect.
   */
  readIndex(
    datasetName: string,
    indexName: string
  ): Promise<MySqlIndexDef | null> {
    void datasetName;
    void indexName;
    throw new Error('ponytail: scaffold only; implement readIndex later');
  }

  /**
   * Creates one table index.
   * @param datasetName - Table name that owns the index.
   * @param desired - Target index definition.
   */
  createIndex(datasetName: string, desired: MySqlIndexDef): Promise<void> {
    void datasetName;
    void desired;
    throw new Error('ponytail: scaffold only; implement createIndex later');
  }
}
