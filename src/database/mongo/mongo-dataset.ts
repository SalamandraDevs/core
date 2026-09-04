import type { Db } from 'mongodb';

import { CustomError } from '@slmdevs/tools/shared';

import type { IDataset } from '../contracts.js';
import type { MongoIndexDef, MongoJSONSchema } from './types.js';

/**
 * MongoDB dataset administration adapter.
 */
export class MongoDataset implements IDataset<MongoJSONSchema, MongoIndexDef> {
  /**
   * Creates a Mongo dataset adapter for one connected database.
   * @param db - Connected Mongo database handle.
   * @returns - A Mongo dataset adapter.
   */
  constructor(private readonly db: Db) {}

  /**
   * Checks whether one collection exists.
   * @param name - Collection name to inspect.
   * @returns - `true` when the collection exists.
   */
  async read(name: string): Promise<boolean> {
    try {
      return await this.db.listCollections({ name }, { nameOnly: true }).hasNext();
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to read MongoDB dataset '${name}'`,
        cause: error
      });
    }
  }

  /**
   * Creates one collection with the desired schema validator.
   * @param name - Collection name to create.
   * @param desiredSchema - Target schema validator.
   * @returns - A promise that resolves when creation completes.
   */
  async create(name: string, desiredSchema: MongoJSONSchema): Promise<void> {
    try {
      await this.db.createCollection(name, desiredSchema);
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to create MongoDB dataset '${name}'`,
        cause: error
      });
    }
  }

  /**
   * Reads one index definition for a collection and returns it, or null.
   * @param datasetName - Collection name that owns the index.
   * @param indexName - Index name to inspect.
   * @returns - The current index, or null when it does not exist.
   */
  async readIndex(datasetName: string, indexName: string): Promise<MongoIndexDef | null> {
    try {
      const indexes: { name?: string }[] = await this.db
        .collection(datasetName)
        .listIndexes()
        .toArray();
      const exists: boolean = indexes.some((index) => index.name === indexName);

      if (!exists) {
        return null;
      }

      return { name: indexName, keys: {} };
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to read index '${indexName}' for MongoDB dataset '${datasetName}'`,
        cause: error
      });
    }
  }

  /**
   * Creates one collection index.
   * @param datasetName - Collection name that owns the index.
   * @param desired - Target index definition.
   * @returns - A promise that resolves when creation completes.
   */
  async createIndex(datasetName: string, desired: MongoIndexDef): Promise<void> {
    try {
      await this.db.collection(datasetName).createIndex(desired.keys, {
        ...desired.options,
        name: desired.name
      });
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to create index '${desired.name}' for MongoDB dataset '${datasetName}'`,
        cause: error
      });
    }
  }
}
