/**
 * Abstract dataset administration workflow for schema and index reconciliation.
 */
export abstract class Dataset<TSchema, TIndex extends { name: string }> {
  /**
   * Ensures one dataset schema matches the desired definition.
   * @param name - Dataset name to reconcile.
   * @param desiredSchema - Target schema definition.
   * @returns - A promise that resolves when reconciliation completes.
   */
  async ensureDataset(name: string, desiredSchema: TSchema): Promise<void> {
    const currentSchema: TSchema | null = await this.readSchema(name);
    await this.reconcileSchema(name, currentSchema, desiredSchema);
  }

  /**
   * Ensures all dataset indexes match the desired definitions.
   * @param datasetName - Dataset name that owns the indexes.
   * @param indexes - Target index definitions.
   * @returns - A promise that resolves when reconciliation completes.
   */
  async ensureIndexes(datasetName: string, indexes: readonly TIndex[]): Promise<void> {
    for (const desiredIndex of indexes) {
      const currentIndex: TIndex | null = await this.readIndex(
        datasetName,
        desiredIndex.name
      );
      await this.reconcileIndex(datasetName, currentIndex, desiredIndex);
    }
  }

  /**
   * Reads the current schema for one dataset.
   * @param name - Dataset name to inspect.
   * @returns - The current schema, or null when the dataset does not exist.
   */
  protected abstract readSchema(name: string): Promise<TSchema | null>;

  /**
   * Reconciles one dataset schema with the desired definition.
   * @param name - Dataset name to reconcile.
   * @param current - Current schema definition, if any.
   * @param desired - Target schema definition.
   * @returns - A promise that resolves when reconciliation completes.
   */
  protected abstract reconcileSchema(
    name: string,
    current: TSchema | null,
    desired: TSchema
  ): Promise<void>;

  /**
   * Reads one index definition for a dataset.
   * @param datasetName - Dataset name that owns the index.
   * @param indexName - Index name to inspect.
   * @returns - The current index definition, or null when it does not exist.
   */
  protected abstract readIndex(
    datasetName: string,
    indexName: string
  ): Promise<TIndex | null>;

  /**
   * Reconciles one dataset index with the desired definition.
   * @param datasetName - Dataset name that owns the index.
   * @param current - Current index definition, if any.
   * @param desired - Target index definition.
   * @returns - A promise that resolves when reconciliation completes.
   */
  protected abstract reconcileIndex(
    datasetName: string,
    current: TIndex | null,
    desired: TIndex
  ): Promise<void>;
}
