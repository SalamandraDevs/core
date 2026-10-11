import { CustomError } from '@salamandradevs/tools/shared';
import { zodToMongoSchema } from '@salamandradevs/tools/shared';
import { zodToMySqlSchema } from '@salamandradevs/tools/shared';
import type { MongoJSONSchema } from '@salamandradevs/tools/shared';

import { DatasetProvisioner } from './dataset-provisioner.js';
import { MongoCrud } from './mongo/mongo-crud.js';
import { MongoDataset } from './mongo/mongo-dataset.js';
import { MySqlCrud } from './mysql/mysql-crud.js';
import { MySqlDataset } from './mysql/mysql-dataset.js';
import type { ICrud, IDatasetProvisioner } from './contracts.js';
import type { DatabaseHandle, DatasetDef, GeneralRecord, IndexDef } from './types.js';
import type { MySqlSchema } from './mysql/types.js';

/**
 * Backend-bound database adapters that provision datasets and build CRUD adapters.
 *
 * @remarks
 * The single point where a connected {@link DatabaseHandle} is resolved to its concrete
 * driver collaborators. The constructor inspects the discriminated `backend` tag once and
 * captures a provisioner and a CRUD-builder closure bound to that handle, so later
 * {@link DatabaseAdapter.provision} and {@link DatabaseAdapter.createCrud} calls never
 * re-check the backend. Adding a backend to {@link DatabaseHandle} without a matching `case`
 * breaks the exhaustiveness `never` check at compile time.
 * @group Infra
 * @category Database
 */
export class DatabaseAdapter {
  /** Runs dataset and index DDL through the backend's `DatasetProvisioner`. */
  private readonly provisioner: IDatasetProvisioner<DatasetDef>;

  /**
   * Closure bound to the connected backend handle, so building a CRUD adapter never
   * re-checks the backend.
   */
  private readonly buildCrud: <T extends GeneralRecord>(name: string) => ICrud<T>;

  /**
   * Selects the backend collaborators for one connected handle.
   *
   * @param handle - Connected, backend-tagged database handle.
   * @throws {CustomError} DB_BACKEND_ERROR when the handle carries an unsupported backend.
   */
  constructor(handle: DatabaseHandle) {
    // The discriminated `backend` tag selects the driver once; each case narrows `handle`
    // to the matching handle shape (`pool` for mysql, `db` for mongodb).
    switch (handle.backend) {
      case 'mysql': {
        const { pool } = handle;

        this.provisioner = new DatasetProvisioner<DatasetDef, MySqlSchema, IndexDef>(
          new MySqlDataset(pool),
          zodToMySqlSchema
        );

        this.buildCrud = <T extends GeneralRecord>(name: string): ICrud<T> =>
          new MySqlCrud<T>(pool, name);

        break;
      }

      case 'mongodb': {
        const { db } = handle;

        this.provisioner = new DatasetProvisioner<DatasetDef, MongoJSONSchema, IndexDef>(
          new MongoDataset(db),
          zodToMongoSchema
        );

        this.buildCrud = <T extends GeneralRecord>(name: string): ICrud<T> =>
          new MongoCrud<T>(db.collection<T>(name));

        break;
      }

      default: {
        const unsupported: never = handle;

        throw new CustomError({
          name: 'DB_BACKEND_ERROR',
          message: `Unsupported database backend: ${String(unsupported)}`
        });
      }
    }
  }

  /**
   * Provisions the given dataset definitions idempotently.
   *
   * @remarks
   * Runs the definitions sequentially so provisioning order is deterministic and failures
   * are attributable to a single dataset. Safe to run on every startup, since the
   * underlying {@link DatasetProvisioner} only creates what is missing.
   * @param defs - Dataset definitions to provision.
   * @returns A promise that resolves when provisioning completes.
   */
  async provision(defs: readonly DatasetDef[]): Promise<void> {
    for (const def of defs) {
      await this.provisioner.provision(def);
    }
  }

  /**
   * Builds a CRUD adapter for one dataset by name.
   *
   * @remarks
   * Delegates to the closure captured at construction, so the returned adapter targets the
   * connected backend without re-inspecting the handle.
   * @template T - Record shape the adapter reads and writes.
   * @param name - Dataset collection or table name.
   * @returns CRUD adapter bound to the connected backend.
   */
  createCrud<T extends GeneralRecord>(name: string): ICrud<T> {
    return this.buildCrud<T>(name);
  }
}
