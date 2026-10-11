import type { Db, IndexSpecification } from 'mongodb';

import { CustomError } from '@salamandradevs/tools/shared';

import type { IDataset } from '../contracts.js';
import type { IndexDef, IndexField } from '../types.js';
import type { MongoJSONSchema } from './types.js';

/**
 * MongoDB dataset administration adapter.
 *
 * @remarks
 * Maps collection and index existence checks and creation onto the driver, and wraps every
 * driver failure as a `DB_DATASET_ERROR`.
 * @group Infra
 * @category Database
 */
export class MongoDataset implements IDataset<MongoJSONSchema, IndexDef> {
  /**
   * Creates a Mongo dataset adapter for one connected database.
   *
   * @param db - Connected Mongo database handle.
   */
  constructor(private readonly db: Db) {}

  /**
   * Checks whether one collection exists.
   *
   * @param name - Collection name to inspect.
   * @returns `true` when the collection exists.
   * @throws {CustomError} DB_DATASET_ERROR when the existence check fails.
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
   *
   * @param name - Collection name to create.
   * @param desiredSchema - Target schema validator.
   * @returns A promise that resolves when creation completes.
   * @throws {CustomError} DB_DATASET_ERROR when collection creation fails.
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
   * Creates one collection index.
   *
   * @param datasetName - Collection name that owns the index.
   * @param desired - Target index definition.
   * @returns A promise that resolves when creation completes.
   * @throws {CustomError} DB_DATASET_ERROR when index creation fails.
   */
  async createIndex(datasetName: string, desired: IndexDef): Promise<void> {
    try {
      await this.db.collection(datasetName).createIndex(this.toMongoIndexKeys(desired), {
        unique: desired.unique,
        name: desired.name
      });
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message:
          `Failed to create index '${desired.name}' for MongoDB dataset ` +
          `'${datasetName}'`,
        cause: error
      });
    }
  }

  /**
   * Reads one index definition for a collection and returns it, or null.
   *
   * @remarks
   * Existence is decided by name only; the returned definition is a presence marker with
   * empty `fields` and `unique: false`, since {@link DatasetProvisioner} only needs to know
   * whether the index exists before creating it. It does not reconcile an existing index
   * against a changed definition.
   * @param datasetName - Collection name that owns the index.
   * @param indexName - Index name to inspect.
   * @returns The current index, or null when it does not exist.
   * @throws {CustomError} DB_DATASET_ERROR when listing indexes fails.
   */
  async readIndex(datasetName: string, indexName: string): Promise<IndexDef | null> {
    try {
      const indexes: { name?: string }[] = await this.db
        .collection(datasetName)
        .listIndexes()
        .toArray();
      const exists: boolean = indexes.some((index) => index.name === indexName);

      if (!exists) {
        return null;
      }

      return { name: indexName, fields: [], unique: false };
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_DATASET_ERROR',
        message: `Failed to read index '${indexName}' for MongoDB dataset '${datasetName}'`,
        cause: error
      });
    }
  }

  /**
   * Translates backend-neutral index intent to MongoDB driver syntax.
   *
   * @param desired - Backend-neutral target index definition.
   * @returns MongoDB index key document.
   */
  private toMongoIndexKeys(desired: IndexDef): IndexSpecification {
    return Object.fromEntries(
      desired.fields.map((field: IndexField): [string, 1 | -1] => [
        field.name,
        field.direction === 'asc' ? 1 : -1
      ])
    );
  }
}
