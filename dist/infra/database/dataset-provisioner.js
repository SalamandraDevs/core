/**
 * Provisioning workflow that converts schemas and coordinates dataset setup.
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
     * @param dataset - Dataset implementation that performs backend operations.
     * @param convertSchema - Converts a Zod schema into the backend schema format.
     */
    constructor(dataset, convertSchema) {
        this.dataset = dataset;
        this.convertSchema = convertSchema;
    }
    /**
     * Provisions one dataset definition idempotently.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YXNldC1wcm92aXNpb25lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9kYXRhc2V0LXByb3Zpc2lvbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQVdWO0lBQ0E7SUFQbkI7Ozs7T0FJRztJQUNILFlBQ21CLE9BQWtDLEVBQ2xDLGFBQXVDO1FBRHZDLFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBQ2xDLGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtJQUN2RCxDQUFDO0lBRUo7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBUztRQUN2QixNQUFNLGVBQWUsR0FBWSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRSxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFZLEVBQUUsYUFBc0I7UUFDOUQsTUFBTSxNQUFNLEdBQVksTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNqRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssS0FBSyxDQUFDLGFBQWEsQ0FDekIsV0FBbUIsRUFDbkIsT0FBMEI7UUFFMUIsS0FBSyxNQUFNLFlBQVksSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFlBQVksR0FBa0IsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FDOUQsV0FBVyxFQUNYLFlBQVksQ0FBQyxJQUFJLENBQ2xCLENBQUM7WUFFRixJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDNUQsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0NBQ0YifQ==