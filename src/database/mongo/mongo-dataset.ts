import type { Db } from 'mongodb';

import { Dataset } from '../dataset.js';
import type { MongoIndexDef, MongoJSONSchema } from './types.js';

/**
 * MongoDB dataset administration adapter.
 */
export class MongoDataset extends Dataset<MongoJSONSchema, MongoIndexDef> {
  /**
   * Creates a Mongo dataset adapter for one connected database.
   * @param db - Connected Mongo database handle.
   */
  constructor(private readonly db: Db) {
    super();
  }

  /**
   * Reads the current JSON schema validator for one collection and returns it, or null.
   * @param name - Collection name to inspect.
   */
  protected readSchema(name: string): Promise<MongoJSONSchema | null> {
    void this.db;
    void name;
    throw new Error('ponytail: scaffold only; implement readSchema later');
  }

  /**
   * Reconciles one collection schema validator with the desired definition.
   * @param name - Collection name to reconcile.
   * @param current - Current schema validator, if any.
   * @param desired - Target schema validator.
   */
  protected reconcileSchema(
    name: string,
    current: MongoJSONSchema | null,
    desired: MongoJSONSchema
  ): Promise<void> {
    void name;
    void current;
    void desired;
    throw new Error('ponytail: scaffold only; implement reconcileSchema later');
  }

  /**
   * Reads one index definition for a collection and returns it, or null.
   * @param datasetName - Collection name that owns the index.
   * @param indexName - Index name to inspect.
   */
  protected readIndex(
    datasetName: string,
    indexName: string
  ): Promise<MongoIndexDef | null> {
    void datasetName;
    void indexName;
    throw new Error('ponytail: scaffold only; implement readIndex later');
  }

  /**
   * Reconciles one collection index with the desired definition.
   * @param datasetName - Collection name that owns the index.
   * @param current - Current index definition, if any.
   * @param desired - Target index definition.
   */
  protected reconcileIndex(
    datasetName: string,
    current: MongoIndexDef | null,
    desired: MongoIndexDef
  ): Promise<void> {
    void datasetName;
    void current;
    void desired;
    throw new Error('ponytail: scaffold only; implement reconcileIndex later');
  }
}
