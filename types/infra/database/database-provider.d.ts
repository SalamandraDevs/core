import type { IDatabaseProvider } from './contracts.js';
import type { DatabaseBackend, DatabaseHandle } from './types.js';
/**
 * Backend-neutral database provider that owns one connection lifecycle.
 *
 * @remarks
 * Selects a MongoDB, MySQL, or future-vendor connection from the `backend` argument,
 * but opens nothing; `connect` establishes the connection and caches the
 * backend-tagged {@link DatabaseHandle} that {@link DatabaseAdapter} consumes. One
 * provider owns one connection, so a composition root closes it once during shutdown.
 * @group Infra
 * @category Database
 */
export declare class DatabaseProvider implements IDatabaseProvider {
    readonly backend: DatabaseBackend;
    private readonly connection;
    private handle;
    /**
     * Creates a provider bound to one backend connection.
     *
     * @param backend - Backend adapter family to connect to.
     * @param uri - Database connection string.
     * @param databaseName - Database name selected after connecting.
     * @throws {CustomError} DB_BACKEND_ERROR when `backend` names an unsupported vendor.
     */
    constructor(backend: DatabaseBackend, uri: string, databaseName: string);
    /**
     * Opens the underlying connection and caches its backend-tagged handle.
     *
     * @remarks
     * The connection's `backend` discriminant narrows it to one driver, so the raw handle is
     * tagged with its `backend` and cached without inspecting the driver. Adding a backend
     * without a matching `case` fails the `never` exhaustiveness check. Calling it again
     * reconnects and replaces the cached handle.
     * @returns The connected database handle.
     */
    connect(): Promise<DatabaseHandle>;
    /**
     * Returns the connected, backend-tagged database handle.
     *
     * @returns Connected database handle.
     * @throws {CustomError} DB_BACKEND_ERROR when called before
     *   {@link DatabaseProvider.connect}.
     */
    getHandle(): DatabaseHandle;
    /**
     * Closes the underlying database connection.
     *
     * @returns A promise that resolves when the connection is closed.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=database-provider.d.ts.map