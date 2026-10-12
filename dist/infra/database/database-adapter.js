import { CustomError } from '@salamandradevs/tools/shared';
import { zodToMongoSchema } from '@salamandradevs/tools/shared';
import { zodToMySqlSchema } from '@salamandradevs/tools/shared';
import { DatasetProvisioner } from './dataset-provisioner.js';
import { MongoCrud } from './mongo/mongo-crud.js';
import { MongoDataset } from './mongo/mongo-dataset.js';
import { MySqlCrud } from './mysql/mysql-crud.js';
import { MySqlDataset } from './mysql/mysql-dataset.js';
/**
 * Backend-bound database adapters that provision datasets and build CRUD adapters.
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
    provisioner;
    /**
     * Closure bound to the connected backend handle, so building a CRUD adapter never
     * re-checks the backend.
     */
    buildCrud;
    /**
     * Selects the backend collaborators for one connected handle.
     * @param handle - Connected, backend-tagged database handle.
     * @throws {CustomError} DB_BACKEND_ERROR when the handle carries an unsupported backend.
     */
    constructor(handle) {
        // The discriminated `backend` tag selects the driver once; each case narrows `handle`
        // to the matching handle shape (`pool` for mysql, `db` for mongodb).
        switch (handle.backend) {
            case 'mysql': {
                const { pool } = handle;
                this.provisioner = new DatasetProvisioner(new MySqlDataset(pool), zodToMySqlSchema);
                this.buildCrud = (name) => new MySqlCrud(pool, name);
                break;
            }
            case 'mongodb': {
                const { db } = handle;
                this.provisioner = new DatasetProvisioner(new MongoDataset(db), zodToMongoSchema);
                this.buildCrud = (name) => new MongoCrud(db.collection(name));
                break;
            }
            default: {
                const unsupported = handle;
                throw new CustomError({
                    name: 'DB_BACKEND_ERROR',
                    message: `Unsupported database backend: ${String(unsupported)}`
                });
            }
        }
    }
    /**
     * Provisions the given dataset definitions idempotently.
     * @remarks
     * Runs the definitions sequentially so provisioning order is deterministic and failures
     * are attributable to a single dataset. Safe to run on every startup, since the
     * underlying {@link DatasetProvisioner} only creates what is missing.
     * @param defs - Dataset definitions to provision.
     * @returns A promise that resolves when provisioning completes.
     */
    async provision(defs) {
        for (const def of defs) {
            await this.provisioner.provision(def);
        }
    }
    /**
     * Builds a CRUD adapter for one dataset by name.
     * @remarks
     * Delegates to the closure captured at construction, so the returned adapter targets the
     * connected backend without re-inspecting the handle.
     * @template T - Record shape the adapter reads and writes.
     * @param name - Dataset collection or table name.
     * @returns CRUD adapter bound to the connected backend.
     */
    createCrud(name) {
        return this.buildCrud(name);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2UtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9kYXRhYmFzZS1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUdoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFLeEQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLE9BQU8sZUFBZTtJQUMxQiw2RUFBNkU7SUFDNUQsV0FBVyxDQUFrQztJQUU5RDs7O09BR0c7SUFDYyxTQUFTLENBQXNEO0lBRWhGOzs7O09BSUc7SUFDSCxZQUFZLE1BQXNCO1FBQ2hDLHNGQUFzRjtRQUN0RixxRUFBcUU7UUFDckUsUUFBUSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkIsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNiLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUM7Z0JBRXhCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxrQkFBa0IsQ0FDdkMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQ3RCLGdCQUFnQixDQUNqQixDQUFDO2dCQUVGLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBMEIsSUFBWSxFQUFZLEVBQUUsQ0FDbkUsSUFBSSxTQUFTLENBQUksSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUUvQixNQUFNO1lBQ1IsQ0FBQztZQUVELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDZixNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUFDO2dCQUV0QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksa0JBQWtCLENBQ3ZDLElBQUksWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUNwQixnQkFBZ0IsQ0FDakIsQ0FBQztnQkFFRixJQUFJLENBQUMsU0FBUyxHQUFHLENBQTBCLElBQVksRUFBWSxFQUFFLENBQ25FLElBQUksU0FBUyxDQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFFM0MsTUFBTTtZQUNSLENBQUM7WUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNSLE1BQU0sV0FBVyxHQUFVLE1BQU0sQ0FBQztnQkFFbEMsTUFBTSxJQUFJLFdBQVcsQ0FBQztvQkFDcEIsSUFBSSxFQUFFLGtCQUFrQjtvQkFDeEIsT0FBTyxFQUFFLGlDQUFpQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUU7aUJBQ2hFLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUEyQjtRQUN6QyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILFVBQVUsQ0FBMEIsSUFBWTtRQUM5QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUksSUFBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNGIn0=