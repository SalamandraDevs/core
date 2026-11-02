/**
 * Provisioning workflow that converts schemas and coordinates dataset setup.
 *
 * @remarks
 * Converts a dataset's Zod schema through the injected {@link SchemaConverter}, then drives
 * an {@link IDataset} to create the dataset and its indexes. Every step is guarded by a
 * prior existence check, so `provision` is idempotent and safe to run on each startup.
 * @group Infra
 * @category Database
 * @template TDef - Dataset definition shape, extending {@link DatasetDef}.
 * @template TSchema - Backend-specific schema format the converter produces.
 * @template TIndex - Backend index definition, identified by `name`.
 */
export class DatasetProvisioner {
    dataset;
    convertSchema;
    /**
     * Creates a provisioner for one dataset administration adapter.
     *
     * @param dataset - Dataset implementation that performs backend operations.
     * @param convertSchema - Converts a Zod schema into the backend schema format.
     */
    constructor(dataset, convertSchema) {
        this.dataset = dataset;
        this.convertSchema = convertSchema;
    }
    /**
     * Provisions one dataset definition idempotently.
     *
     * @remarks
     * Converts the schema first, then ensures the dataset before its indexes, since an index
     * cannot be created on a dataset that does not yet exist.
     * @param def - Dataset definition with schema and indexes.
     * @returns A promise that resolves when provisioning completes.
     */
    async provision(def) {
        const convertedSchema = this.convertSchema(def.schema);
        await this.ensureDataset(def.name, convertedSchema);
        await this.ensureIndexes(def.name, def.indexes);
    }
    /**
     * Creates a dataset only when it does not already exist.
     *
     * @param name - Dataset name to provision.
     * @param desiredSchema - Backend-specific schema definition.
     * @returns A promise that resolves when the dataset exists.
     */
    async ensureDataset(name, desiredSchema) {
        const exists = await this.dataset.read(name);
        if (!exists) {
            await this.dataset.create(name, desiredSchema);
        }
    }
    /**
     * Creates missing dataset indexes.
     *
     * @param datasetName - Dataset name that owns the indexes.
     * @param indexes - Target index definitions.
     * @returns A promise that resolves when all indexes exist.
     */
    async ensureIndexes(datasetName, indexes) {
        for (const desiredIndex of indexes) {
            const currentIndex = await this.dataset.readIndex(datasetName, desiredIndex.name);
            if (currentIndex === null) {
                await this.dataset.createIndex(datasetName, desiredIndex);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YXNldC1wcm92aXNpb25lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9kYXRhc2V0LXByb3Zpc2lvbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFZVjtJQUNBO0lBUm5COzs7OztPQUtHO0lBQ0gsWUFDbUIsT0FBa0MsRUFDbEMsYUFBdUM7UUFEdkMsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7UUFDbEMsa0JBQWEsR0FBYixhQUFhLENBQTBCO0lBQ3ZELENBQUM7SUFFSjs7Ozs7Ozs7T0FRRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBUztRQUN2QixNQUFNLGVBQWUsR0FBWSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRSxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNLLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWSxFQUFFLGFBQXNCO1FBQzlELE1BQU0sTUFBTSxHQUFZLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDakQsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSyxLQUFLLENBQUMsYUFBYSxDQUN6QixXQUFtQixFQUNuQixPQUEwQjtRQUUxQixLQUFLLE1BQU0sWUFBWSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFrQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUM5RCxXQUFXLEVBQ1gsWUFBWSxDQUFDLElBQUksQ0FDbEIsQ0FBQztZQUVGLElBQUksWUFBWSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMxQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7Q0FDRiJ9