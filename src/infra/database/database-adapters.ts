import { CustomError } from '@slmdevs/tools/shared';
import { zodToMongoSchema } from '@slmdevs/tools/shared';
import { zodToMySqlSchema } from '@slmdevs/tools/shared';
import type { MongoJSONSchema } from '@slmdevs/tools/shared';

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
 */
export class DatabaseAdapters {
  /** Runs dataset and index DDL through the backend's `DatasetProvisioner`. */
  readonly #provisioner: IDatasetProvisioner<DatasetDef>;

  /**
   * Closure bound to the connected backend handle, so building a CRUD adapter never re-checks
   * the backend.
   */
  readonly #createCrud: <T extends GeneralRecord>(name: string) => ICrud<T>;

  /**
   * Selects the backend collaborators for one connected handle.
   * @param handle - Connected, backend-tagged database handle.
   */
  constructor(handle: DatabaseHandle) {
    /**
     * The discriminated `backend` tag selects the driver once; each case narrows `handle`
     * to the matching handle shape (`pool` for mysql, `db` for mongodb).
     */
    switch (handle.backend) {
      case 'mysql': {
        const { pool } = handle;

        this.#provisioner = new DatasetProvisioner<DatasetDef, MySqlSchema, IndexDef>(
          new MySqlDataset(pool),
          zodToMySqlSchema
        );

        this.#createCrud = <T extends GeneralRecord>(name: string): ICrud<T> =>
          new MySqlCrud<T>(pool, name);

        break;
      }

      case 'mongodb': {
        const { db } = handle;

        this.#provisioner = new DatasetProvisioner<DatasetDef, MongoJSONSchema, IndexDef>(
          new MongoDataset(db),
          zodToMongoSchema
        );

        this.#createCrud = <T extends GeneralRecord>(name: string): ICrud<T> =>
          new MongoCrud<T>(db.collection<T>(name));

        break;
      }

      default: {
        // NOTE: Each supported backend needs its own case above. Adding a backend to
        // DatabaseHandle without a case here makes the `never` line fail to compile.
        const unsupported: never = handle;

        throw new CustomError({
          name: 'DB_ADAPTER_ERROR',
          message: `Unsupported database backend: ${String(unsupported)}`
        });
      }
    }
  }

  /**
   * Provisions the given dataset definitions idempotently.
   * @param defs - Dataset definitions to provision.
   * @returns A promise that resolves when provisioning completes.
   */
  async provision(defs: readonly DatasetDef[]): Promise<void> {
    for (const def of defs) {
      await this.#provisioner.provision(def);
    }
  }

  /**
   * Builds a CRUD adapter for one dataset by name.
   * @param name - Dataset collection or table name.
   * @returns CRUD adapter bound to the connected backend.
   */
  createCrud<T extends GeneralRecord>(name: string): ICrud<T> {
    return this.#createCrud<T>(name);
  }
}
