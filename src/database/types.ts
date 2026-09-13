import type { ZodType } from 'zod';

/**
 * Generic backend-neutral key-value record.
 */
export type GeneralRecord = {
  [key: string]: unknown;
};

/**
 * Backend-neutral index direction used by dataset provisioning.
 */
export type IndexDirection = 'asc' | 'desc';

/**
 * Backend-neutral field participating in an index definition.
 * - name: Record field included in the index.
 * - direction: Sort direction used by the index for this field.
 */
export type IndexField = Readonly<{
  name: string;
  direction: IndexDirection;
}>;

/**
 * Backend-neutral index intent used by dataset provisioning.
 * - name: Stable index name.
 * - fields: Ordered index fields and their directions.
 * - unique: Whether the index enforces uniqueness.
 */
export type IndexDef = Readonly<{
  name: string;
  fields: readonly IndexField[];
  unique: boolean;
}>;

/**
 * Backend-neutral dataset definition used by provisioning workflows.
 * - name: Dataset name to create when missing.
 * - schema: Zod schema describing the entity record shape.
 * - indexes: Backend-neutral index intent for the dataset.
 */
export type DatasetDef<TIndex extends { name: string } = IndexDef> = Readonly<{
  name: string;
  schema: ZodType;
  indexes: readonly TIndex[];
}>;

/**
 * Backend-neutral find ordering direction.
 */
export type FindOrderDirection = 'asc' | 'desc';

/**
 * Backend-neutral ordered field used by paged find operations.
 * - field: Record field used by the database ORDER BY or sort clause.
 * - direction: Sort direction applied to the selected record field.
 */
export type FindOrder = Readonly<{
  field: string;
  direction: FindOrderDirection;
}>;

/**
 * Backend-neutral options accepted by find operations.
 * - limit: Maximum records returned to the caller.
 * - cursor: Last seen ordered field values used to continue the result page.
 * - orderBy: Ordered fields that define deterministic cursor continuation.
 */
export type FindOptions<T> = Readonly<{
  limit: number;
  cursor: Partial<T> | null;
  orderBy: readonly FindOrder[];
}>;

/**
 * Backend-neutral find result with page metadata.
 * - records: Records returned after applying criteria and find options.
 * - hasNextPage: Whether another page exists after the returned records.
 */
export type FindResult<T> = Readonly<{
  records: T[];
  hasNextPage: boolean;
}>;
