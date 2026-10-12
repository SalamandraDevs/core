import type { Db } from 'mongodb';
import type { IDataset } from '../contracts.js';
import type { IndexDef } from '../types.js';
import type { MongoJSONSchema } from './types.js';
/**
 * MongoDB dataset administration adapter.
 * @remarks
 * Maps collection and index existence checks and creation onto the driver, and wraps every
 * driver failure as a `DB_DATASET_ERROR`.
 * @group Infra
 * @category Database
 */
export declare class MongoDataset implements IDataset<MongoJSONSchema, IndexDef> {
    private readonly db;
    /**
     * Creates a Mongo dataset adapter for one connected database.
     * @param db - Connected Mongo database handle.
     */
    constructor(db: Db);
    /**
     * Checks whether one collection exists.
     * @param name - Collection name to inspect.
     * @returns `true` when the collection exists.
     * @throws {CustomError} DB_DATASET_ERROR when the existence check fails.
     */
    read(name: string): Promise<boolean>;
    /**
     * Creates one collection with the desired schema validator.
     * @param name - Collection name to create.
     * @param desiredSchema - Target schema validator.
     * @returns A promise that resolves when creation completes.
     * @throws {CustomError} DB_DATASET_ERROR when collection creation fails.
     */
    create(name: string, desiredSchema: MongoJSONSchema): Promise<void>;
    /**
     * Creates one collection index.
     * @param datasetName - Collection name that owns the index.
     * @param desired - Target index definition.
     * @returns A promise that resolves when creation completes.
     * @throws {CustomError} DB_DATASET_ERROR when index creation fails.
     */
    createIndex(datasetName: string, desired: IndexDef): Promise<void>;
    /**
     * Reads one index definition for a collection and returns it, or null.
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
    readIndex(datasetName: string, indexName: string): Promise<IndexDef | null>;
    /**
     * Translates backend-neutral index intent to MongoDB driver syntax.
     * @param desired - Backend-neutral target index definition.
     * @returns MongoDB index key document.
     */
    private toMongoIndexKeys;
}
//# sourceMappingURL=mongo-dataset.d.ts.map