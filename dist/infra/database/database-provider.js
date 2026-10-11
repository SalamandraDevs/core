import { CustomError } from '@salamandradevs/tools/shared';
import { MongoDbConnection } from './mongo/mongo-db-connection.js';
import { MySqlDbConnection } from './mysql/mysql-db-connection.js';
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
export class DatabaseProvider {
    backend;
    connection;
    handle = null;
    /**
     * Creates a provider bound to one backend connection.
     *
     * @param backend - Backend adapter family to connect to.
     * @param uri - Database connection string.
     * @param databaseName - Database name selected after connecting.
     * @throws {CustomError} DB_BACKEND_ERROR when `backend` names an unsupported vendor.
     */
    constructor(backend, uri, databaseName) {
        this.backend = backend;
        // The backend discriminant selects the connection vendor once; adding a backend to
        // DatabaseBackend without a case here fails the `never` exhaustiveness check.
        switch (backend) {
            case 'mysql': {
                this.connection = new MySqlDbConnection(uri, databaseName);
                break;
            }
            case 'mongodb': {
                this.connection = new MongoDbConnection(uri, databaseName);
                break;
            }
            default: {
                const unsupported = backend;
                throw new CustomError({
                    name: 'DB_BACKEND_ERROR',
                    message: `Unsupported database backend: ${String(unsupported)}`
                });
            }
        }
    }
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
    async connect() {
        switch (this.connection.backend) {
            case 'mysql': {
                this.handle = { backend: 'mysql', pool: await this.connection.connect() };
                break;
            }
            case 'mongodb': {
                this.handle = { backend: 'mongodb', db: await this.connection.connect() };
                break;
            }
            default: {
                const unsupported = this.connection;
                throw new CustomError({
                    name: 'DB_BACKEND_ERROR',
                    message: `Unsupported database backend: ${String(unsupported)}`
                });
            }
        }
        return this.handle;
    }
    /**
     * Returns the connected, backend-tagged database handle.
     *
     * @returns Connected database handle.
     * @throws {CustomError} DB_BACKEND_ERROR when called before
     *   {@link DatabaseProvider.connect}.
     */
    getHandle() {
        if (!this.handle) {
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
                message: 'Database provider connection has not been opened'
            });
        }
        return this.handle;
    }
    /**
     * Closes the underlying database connection.
     *
     * @returns A promise that resolves when the connection is closed.
     */
    async close() {
        await this.connection.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2UtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5mcmEvZGF0YWJhc2UvZGF0YWJhc2UtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSW5FOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBYVQ7SUFaRCxVQUFVLENBQXdDO0lBQzNELE1BQU0sR0FBMEIsSUFBSSxDQUFDO0lBRTdDOzs7Ozs7O09BT0c7SUFDSCxZQUNrQixPQUF3QixFQUN4QyxHQUFXLEVBQ1gsWUFBb0I7UUFGSixZQUFPLEdBQVAsT0FBTyxDQUFpQjtRQUl4QyxtRkFBbUY7UUFDbkYsOEVBQThFO1FBQzlFLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDaEIsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNiLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBRTNELE1BQU07WUFDUixDQUFDO1lBRUQsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNmLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBRTNELE1BQU07WUFDUixDQUFDO1lBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDUixNQUFNLFdBQVcsR0FBVSxPQUFPLENBQUM7Z0JBRW5DLE1BQU0sSUFBSSxXQUFXLENBQUM7b0JBQ3BCLElBQUksRUFBRSxrQkFBa0I7b0JBQ3hCLE9BQU8sRUFBRSxpQ0FBaUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFO2lCQUNoRSxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxLQUFLLENBQUMsT0FBTztRQUNYLFFBQVEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUUxRSxNQUFNO1lBQ1IsQ0FBQztZQUVELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDZixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBRTFFLE1BQU07WUFDUixDQUFDO1lBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDUixNQUFNLFdBQVcsR0FBVSxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUUzQyxNQUFNLElBQUksV0FBVyxDQUFDO29CQUNwQixJQUFJLEVBQUUsa0JBQWtCO29CQUN4QixPQUFPLEVBQUUsaUNBQWlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRTtpQkFDaEUsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQVM7UUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxXQUFXLENBQUM7Z0JBQ3BCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLE9BQU8sRUFBRSxrREFBa0Q7YUFDNUQsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxLQUFLO1FBQ1QsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2hDLENBQUM7Q0FDRiJ9