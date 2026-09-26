import type { ZodType } from 'zod';

import type { DatabaseBackend, DatabaseHandle } from './types.js';
import type { FindOptions, FindResult } from './types.js';

/**
 * Backend-neutral database provider that owns one connection lifecycle.
 */
export interface IDatabaseProvider {
  /** Backend adapter family this provider connects to. */
  readonly backend: DatabaseBackend;

  /**
   * Opens the underlying connection and caches its backend-tagged handle.
   * @returns The connected database handle.
   */
  connect(): Promise<DatabaseHandle>;

  /**
   * Returns the connected, backend-tagged database handle.
   * @returns Connected database handle.
   */
  getHandle(): DatabaseHandle;

  /**
   * Closes the underlying database connection.
   * @returns A promise that resolves when the connection is closed.
   */
  close(): Promise<void>;
}

/**
 * Database connection lifecycle contract for one backend handle.
 */
export interface IDbConnection<THandle> {
  /** Opens the database connection and returns the backend handle. */
  connect(): Promise<THandle>;

  /** Closes the database connection. */
  close(): Promise<void>;
}

/**
 * Backend operations used by dataset provisioning.
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

/** Converts a Zod schema into a backend-specific schema definition. */
export type SchemaConverter<TSchema> = (schema: ZodType) => TSchema;

/**
 * Provisioning contract that idempotently sets up dataset definitions.
 */
export interface IDatasetProvisioner<TDef> {
  /**
   * Provisions one dataset definition idempotently.
   * @param def - Dataset definition with schema and indexes.
   * @returns A promise that resolves when provisioning completes.
   */
  provision(def: TDef): Promise<void>;
}
