import type { ICrud } from './contracts.js';
import type { DatabaseHandle, DatasetDef, GeneralRecord } from './types.js';
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
export declare class DatabaseAdapter {
    /** Runs dataset and index DDL through the backend's `DatasetProvisioner`. */
    private readonly provisioner;
    /**
     * Closure bound to the connected backend handle, so building a CRUD adapter never
     * re-checks the backend.
     */
    private readonly buildCrud;
    /**
     * Selects the backend collaborators for one connected handle.
     * @param handle - Connected, backend-tagged database handle.
     * @throws {CustomError} DB_BACKEND_ERROR when the handle carries an unsupported backend.
     */
    constructor(handle: DatabaseHandle);
    /**
     * Provisions the given dataset definitions idempotently.
     * @remarks
     * Runs the definitions sequentially so provisioning order is deterministic and failures
     * are attributable to a single dataset. Safe to run on every startup, since the
     * underlying {@link DatasetProvisioner} only creates what is missing.
     * @param defs - Dataset definitions to provision.
     * @returns A promise that resolves when provisioning completes.
     */
    provision(defs: readonly DatasetDef[]): Promise<void>;
    /**
     * Builds a CRUD adapter for one dataset by name.
     * @remarks
     * Delegates to the closure captured at construction, so the returned adapter targets the
     * connected backend without re-inspecting the handle.
     * @template T - Record shape the adapter reads and writes.
     * @param name - Dataset collection or table name.
     * @returns CRUD adapter bound to the connected backend.
     */
    createCrud<T extends GeneralRecord>(name: string): ICrud<T>;
}
//# sourceMappingURL=database-adapter.d.ts.map