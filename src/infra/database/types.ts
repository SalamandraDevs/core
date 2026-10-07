import type { Db } from 'mongodb';
import type { Pool } from 'mysql2/promise';
import type { ZodType } from 'zod';

/**
 * Generic backend-neutral key-value record.
 * @remarks
 * The upper bound for CRUD record types when no stronger shape is known; concrete records
 * extend it with their own fields.
 * @group Database
 * @category Database
 */
export type GeneralRecord = {
  [key: string]: unknown;
};

/**
 * Backend adapter family selected by a composition root.
 * @remarks
 * The discriminant that drives backend selection throughout the layer, from {@link DatabaseHandle}
 * to the `switch` in {@link DatabaseAdapter}.
 * @group Database
 * @category Database
 */
export type DatabaseBackend = 'mongodb' | 'mysql';

/**
 * Connected database handle tagged by its backend family.
 * - backend: Selected backend adapter family.
 * - db: Connected MongoDB database handle, present for the mongodb backend.
 * - pool: Connected MySQL connection pool, present for the mysql backend.
 * @remarks
 * A discriminated union on `backend`: narrowing on that tag reveals exactly one of `db` or
 * `pool`, so consumers select driver-specific collaborators without unsafe casts.
 * @group Database
 * @category Database
 */
export type DatabaseHandle =
  Readonly<{ backend: 'mongodb'; db: Db }> | Readonly<{ backend: 'mysql'; pool: Pool }>;

/**
 * Backend-neutral index direction used by dataset provisioning.
 * @group Database
 * @category Database
 */
export type IndexDirection = 'asc' | 'desc';

/**
 * Backend-neutral field participating in an index definition.
 * - name: Record field included in the index.
 * - direction: Sort direction used by the index for this field.
 * @group Database
 * @category Database
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
 * @remarks
 * Declares desired state, not a command: {@link DatasetProvisioner} looks the index up by `name`
 * and creates it only when absent. `fields` order is significant, matching the query ordering the
 * index supports.
 * @group Database
 * @category Database
 */
export type IndexDef = Readonly<{
  name: string;
  fields: readonly IndexField[];
  unique: boolean;
}>;

/**
 * Backend-neutral dataset definition used by provisioning workflows.
 * - name: Dataset name to create when missing.
 * - schema: Zod schema describing the record shape.
 * - indexes: Backend-neutral index intent for the dataset.
 * @remarks
 * The unit {@link IDatasetProvisioner} provisions; the Zod `schema` is passed through a
 * {@link SchemaConverter} into the backend's schema format before the dataset is created.
 * @template TIndex - Index definition shape, defaulting to {@link IndexDef}.
 * @group Database
 * @category Database
 */
export type DatasetDef<TIndex extends { name: string } = IndexDef> = Readonly<{
  name: string;
  schema: ZodType;
  indexes: readonly TIndex[];
}>;

/**
 * Backend-neutral find ordering direction.
 * @group Database
 * @category Database
 */
export type FindOrderDirection = 'asc' | 'desc';

/**
 * Backend-neutral ordered field used by paged find operations.
 * - field: Record field used by the database ORDER BY or sort clause.
 * - direction: Sort direction applied to the selected record field.
 * @group Database
 * @category Database
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
 * @remarks
 * Drives keyset pagination: `cursor` holds the `orderBy` field values of the last row from the
 * previous page, so continuation is stable under inserts. The `orderBy` fields must be unique in
 * combination for the cursor to identify a single boundary row.
 * @template T - Record shape whose fields the cursor references.
 * @group Database
 * @category Database
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
 * @remarks
 * `hasNextPage` lets callers decide whether to request another page without a separate count
 * query; the last returned record supplies the next {@link FindOptions} cursor.
 * @template T - Record shape returned in `records`.
 * @group Database
 * @category Database
 */
export type FindResult<T> = Readonly<{
  records: T[];
  hasNextPage: boolean;
}>;
