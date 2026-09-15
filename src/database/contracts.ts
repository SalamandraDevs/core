import type { ZodType } from 'zod';

import type { FindOptions, FindResult } from './types.js';

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

/** Converts a Zod schema into a backend-specific schema definition. */
export type SchemaConverter<TSchema> = (schema: ZodType) => TSchema;

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
