import type { ZodType } from 'zod';

import { Dataset } from './dataset.js';

/**
 * Abstract provisioning workflow that converts schemas and coordinates dataset setup.
 */
export abstract class DatasetProvisioner<
  TDef extends {
    name: string;
    schema: ZodType;
    indexes: readonly TIndex[];
  },
  TSchema,
  TIndex extends { name: string }
> {
  /**
   * Creates a provisioner for one dataset administration adapter.
   * @param dataset - Dataset implementation that reconciles schema and indexes.
   */
  constructor(private readonly dataset: Dataset<TSchema, TIndex>) {}

  /**
   * Provisions one dataset definition idempotently.
   * @param def - Dataset definition with schema and indexes.
   * @returns - A promise that resolves when provisioning completes.
   */
  async ensure(def: TDef): Promise<void> {
    const convertedSchema: TSchema = this.convertSchema(def.schema);

    await this.dataset.ensureDataset(def.name, convertedSchema);
    await this.dataset.ensureIndexes(def.name, def.indexes);
  }

  /**
   * Converts one Zod schema into the backend-specific schema format.
   * @param schema - Source Zod schema for the dataset.
   * @returns - Backend-specific schema definition.
   */
  protected abstract convertSchema(schema: ZodType): TSchema;
}
