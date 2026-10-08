import type { IDataset, IDatasetProvisioner, SchemaConverter } from './contracts.js';
import type { DatasetDef } from './types.js';

/**
 * Provisioning workflow that converts schemas and coordinates dataset setup.
 *
 * @remarks
 * Converts a dataset's Zod schema through the injected {@link SchemaConverter}, then
 * drives an {@link IDataset} to create the dataset and its indexes. Every step is
 * guarded by a prior existence check, so `provision` is idempotent and safe to run on
 * each startup.
 * @group Infra
 * @category Database
 * @template TDef - Dataset definition shape, extending {@link DatasetDef}.
 * @template TSchema - Backend-specific schema format the converter produces.
 * @template TIndex - Backend index definition, identified by `name`.
 */
export class DatasetProvisioner<
  TDef extends DatasetDef<TIndex>,
  TSchema,
  TIndex extends { name: string }
> implements IDatasetProvisioner<TDef> {
  /**
   * Creates a provisioner for one dataset administration adapter.
   *
   * @param dataset - Dataset implementation that performs backend operations.
   * @param convertSchema - Converts a Zod schema into the backend schema format.
   */
  constructor(
    private readonly dataset: IDataset<TSchema, TIndex>,
    private readonly convertSchema: SchemaConverter<TSchema>
  ) {}

  /**
   * Provisions one dataset definition idempotently.
   *
   * @remarks
   * Converts the schema first, then ensures the dataset before its indexes, since an index
   * cannot be created on a dataset that does not yet exist.
   * @param def - Dataset definition with schema and indexes.
   * @returns A promise that resolves when provisioning completes.
   */
  async provision(def: TDef): Promise<void> {
    const convertedSchema: TSchema = this.convertSchema(def.schema);

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
  private async ensureDataset(name: string, desiredSchema: TSchema): Promise<void> {
    const exists: boolean = await this.dataset.read(name);

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
  private async ensureIndexes(
    datasetName: string,
    indexes: readonly TIndex[]
  ): Promise<void> {
    for (const desiredIndex of indexes) {
      const currentIndex: TIndex | null = await this.dataset.readIndex(
        datasetName,
        desiredIndex.name
      );

      if (currentIndex === null) {
        await this.dataset.createIndex(datasetName, desiredIndex);
      }
    }
  }
}
