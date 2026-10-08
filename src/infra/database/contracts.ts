import type { ZodType } from 'zod';

import type { DatabaseBackend, DatabaseHandle } from './types.js';
import type { FindOptions, FindResult } from './types.js';

/**
 * Backend-neutral database provider that owns one connection lifecycle.
 *
 * @remarks
 * Abstracts the connection so composition roots depend on this contract rather than a
 * concrete MongoDB or MySQL driver; {@link DatabaseProvider} is the shipped implementation.
 * `connect` caches the handle, `getHandle` returns it, and `close` releases it.
 * @group Infra
 * @category Database
 */
export interface IDatabaseProvider {
  /** Backend adapter family this provider connects to. */
  readonly backend: DatabaseBackend;

  /**
   * Opens the underlying connection and caches its backend-tagged handle.
   *
   * @returns The connected database handle.
   */
  connect(): Promise<DatabaseHandle>;

  /**
   * Returns the connected, backend-tagged database handle.
   *
   * @returns Connected database handle.
   */
  getHandle(): DatabaseHandle;

  /**
   * Closes the underlying database connection.
   *
   * @returns A promise that resolves when the connection is closed.
   */
  close(): Promise<void>;
}

/**
 * Database connection lifecycle contract for one backend handle.
 *
 * @remarks
 * The lower-level primitive beneath {@link IDatabaseProvider}: a driver-specific connection
 * that yields a raw handle (a MongoDB `Db` or a MySQL `Pool`) which the provider tags by
 * backend.
 * @group Infra
 * @category Database
 * @template THandle - Raw driver handle produced by `connect`.
 */
export interface IDbConnection<THandle> {
  /** Opens the database connection and returns the backend handle. */
  connect(): Promise<THandle>;

  /** Closes the database connection. */
  close(): Promise<void>;
}

/**
 * Backend operations used by dataset provisioning.
 *
 * @remarks
 * The read/create primitives {@link DatasetProvisioner} composes into an idempotent
 * workflow: `read` and `readIndex` report current state so `create` and `createIndex` run
 * only for what is missing.
 * @group Infra
 * @category Database
 * @template TSchema - Backend-specific schema format for a dataset.
 * @template TIndex - Backend index definition, identified by `name`.
 */
export interface IDataset<TSchema, TIndex extends { name: string }> {
  /** Checks whether one dataset exists. */
  read(name: string): Promise<boolean>;

  /** Creates one dataset with its desired schema. */
  create(name: string, desiredSchema: TSchema): Promise<void>;

  /** Reads one index definition, or null when it does not exist. */
  readIndex(datasetName: string, indexName: string): Promise<TIndex | null>;

  /** Creates one dataset index. */
  createIndex(datasetName: string, desired: TIndex): Promise<void>;
}

/**
 * Backend-neutral CRUD contract for one record type.
 *
 * @remarks
 * The persistence surface {@link RecordsHandler} delegates to, so policy code stays
 * independent of the backend. Every operation matches on all fields of `criteria`; the
 * single-record methods resolve to `null` when nothing matches rather than throwing.
 * @group Infra
 * @category Database
 * @template T - Record shape persisted by the adapter.
 */
export interface ICrud<T> {
  /** Persists one record. */
  create(record: T): Promise<T>;

  /** Reads one record matching all criteria fields. */
  read(criteria: Partial<T>): Promise<T | null>;

  /** Updates one record matching all criteria fields. */
  update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null>;

  /** Deletes one record matching all criteria fields. */
  delete(criteria: Partial<T>): Promise<T | null>;

  /** Finds records matching all criteria fields and required page controls. */
  find(criteria: Partial<T>, options: FindOptions<T>): Promise<FindResult<T>>;
}

/**
 * Converts a Zod schema into a backend-specific schema definition.
 *
 * @remarks
 * The seam that keeps {@link DatasetProvisioner} backend-agnostic; `zodToMongoSchema` and
 * `zodToMySqlSchema` are the concrete converters supplied per backend.
 * @group Infra
 * @category Database
 * @template TSchema - Backend-specific schema format produced from the Zod source.
 */
export type SchemaConverter<TSchema> = (schema: ZodType) => TSchema;

/**
 * Provisioning contract that idempotently sets up dataset definitions.
 *
 * @remarks
 * Implemented by {@link DatasetProvisioner}; `provision` is safe to run on every startup
 * because it creates only the datasets and indexes that are missing.
 * @group Infra
 * @category Database
 * @template TDef - Dataset definition provisioned by the implementation.
 */
export interface IDatasetProvisioner<TDef> {
  /**
   * Provisions one dataset definition idempotently.
   *
   * @param def - Dataset definition with schema and indexes.
   * @returns A promise that resolves when provisioning completes.
   */
  provision(def: TDef): Promise<void>;
}
