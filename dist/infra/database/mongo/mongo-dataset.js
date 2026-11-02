import { CustomError } from '@salamandradevs/tools/shared';
/**
 * MongoDB dataset administration adapter.
 *
 * @remarks
 * Maps collection and index existence checks and creation onto the driver, and wraps every
 * driver failure as a `DB_DATASET_ERROR`.
 * @group Infra
 * @category Database
 */
export class MongoDataset {
    db;
    /**
     * Creates a Mongo dataset adapter for one connected database.
     *
     * @param db - Connected Mongo database handle.
     */
    constructor(db) {
        this.db = db;
    }
    /**
     * Checks whether one collection exists.
     *
     * @param name - Collection name to inspect.
     * @returns `true` when the collection exists.
     * @throws {CustomError} DB_DATASET_ERROR when the existence check fails.
     */
    async read(name) {
        try {
            return await this.db.listCollections({ name }, { nameOnly: true }).hasNext();
        }
        catch (error) {
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
    async create(name, desiredSchema) {
        try {
            await this.db.createCollection(name, desiredSchema);
        }
        catch (error) {
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
    async createIndex(datasetName, desired) {
        try {
            await this.db.collection(datasetName).createIndex(this.toMongoIndexKeys(desired), {
                unique: desired.unique,
                name: desired.name
            });
        }
        catch (error) {
            throw new CustomError({
                name: 'DB_DATASET_ERROR',
                message: `Failed to create index '${desired.name}' for MongoDB dataset ` +
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
    async readIndex(datasetName, indexName) {
        try {
            const indexes = await this.db
                .collection(datasetName)
                .listIndexes()
                .toArray();
            const exists = indexes.some((index) => index.name === indexName);
            if (!exists) {
                return null;
            }
            return { name: indexName, fields: [], unique: false };
        }
        catch (error) {
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
    toMongoIndexKeys(desired) {
        return Object.fromEntries(desired.fields.map((field) => [
            field.name,
            field.direction === 'asc' ? 1 : -1
        ]));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28tZGF0YXNldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9tb25nby9tb25nby1kYXRhc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQU0zRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBTU07SUFMN0I7Ozs7T0FJRztJQUNILFlBQTZCLEVBQU07UUFBTixPQUFFLEdBQUYsRUFBRSxDQUFJO0lBQUcsQ0FBQztJQUV2Qzs7Ozs7O09BTUc7SUFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVk7UUFDckIsSUFBSSxDQUFDO1lBQ0gsT0FBTyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMvRSxDQUFDO1FBQUMsT0FBTyxLQUFjLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksV0FBVyxDQUFDO2dCQUNwQixJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixPQUFPLEVBQUUsbUNBQW1DLElBQUksR0FBRztnQkFDbkQsS0FBSyxFQUFFLEtBQUs7YUFDYixDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVksRUFBRSxhQUE4QjtRQUN2RCxJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxXQUFXLENBQUM7Z0JBQ3BCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLE9BQU8sRUFBRSxxQ0FBcUMsSUFBSSxHQUFHO2dCQUNyRCxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBbUIsRUFBRSxPQUFpQjtRQUN0RCxJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ2hGLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2FBQ25CLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxXQUFXLENBQUM7Z0JBQ3BCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLE9BQU8sRUFDTCwyQkFBMkIsT0FBTyxDQUFDLElBQUksd0JBQXdCO29CQUMvRCxJQUFJLFdBQVcsR0FBRztnQkFDcEIsS0FBSyxFQUFFLEtBQUs7YUFDYixDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsV0FBbUIsRUFBRSxTQUFpQjtRQUNwRCxJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBd0IsTUFBTSxJQUFJLENBQUMsRUFBRTtpQkFDL0MsVUFBVSxDQUFDLFdBQVcsQ0FBQztpQkFDdkIsV0FBVyxFQUFFO2lCQUNiLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxNQUFNLEdBQVksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQztZQUUxRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDO1lBRUQsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDeEQsQ0FBQztRQUFDLE9BQU8sS0FBYyxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLFdBQVcsQ0FBQztnQkFDcEIsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsT0FBTyxFQUFFLHlCQUF5QixTQUFTLDBCQUEwQixXQUFXLEdBQUc7Z0JBQ25GLEtBQUssRUFBRSxLQUFLO2FBQ2IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLGdCQUFnQixDQUFDLE9BQWlCO1FBQ3hDLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FDdkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFpQixFQUFvQixFQUFFLENBQUM7WUFDMUQsS0FBSyxDQUFDLElBQUk7WUFDVixLQUFLLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0NBQ0YifQ==