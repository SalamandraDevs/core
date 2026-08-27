import { Dataset } from '../base/dataset.js';

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
export class MySqlDataset extends Dataset<MySqlSchema, MySqlIndexDef> {
  /**
   * Reads the current schema definition for one table and returns it, or null.
   * @param name - Table name to inspect.
   */
  protected readSchema(name: string): Promise<MySqlSchema | null> {
    void name;
    throw new Error('ponytail: scaffold only; implement readSchema later');
  }

  /**
   * Reconciles one table schema with the desired definition.
   * @param name - Table name to reconcile.
   * @param current - Current schema definition, if any.
   * @param desired - Target schema definition.
   */
  protected reconcileSchema(
    name: string,
    current: MySqlSchema | null,
    desired: MySqlSchema
  ): Promise<void> {
    void name;
    void current;
    void desired;
    throw new Error('ponytail: scaffold only; implement reconcileSchema later');
  }

  /**
   * Reads one index definition for a table and returns it, or null.
   * @param datasetName - Table name that owns the index.
   * @param indexName - Index name to inspect.
   */
  protected readIndex(
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
  protected createIndex(datasetName: string, desired: MySqlIndexDef): Promise<void> {
    void datasetName;
    void desired;
    throw new Error('ponytail: scaffold only; implement createIndex later');
  }
}
