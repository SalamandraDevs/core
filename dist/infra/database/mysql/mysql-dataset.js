import { CustomError } from '@salamandradevs/tools/shared';
/**
 * MySQL dataset administration adapter.
 * @remarks
 * Inspects `information_schema` for table and index existence and issues DDL to create what
 * is missing, wrapping every driver failure as a `DB_DATASET_ERROR`. Unlike the Mongo
 * adapter, `readIndex` reconstructs the full index definition (fields, direction, and
 * uniqueness) from catalog rows.
 * @group Infra
 * @category Database
 */
export class MySqlDataset {
    pool;
    /**
     * Creates a MySQL dataset adapter for one connected database.
     * @param pool - Connected MySQL pool.
     */
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Checks whether one table exists.
     * @param name - Table name to inspect.
     * @returns Whether the table exists.
     * @throws {CustomError} DB_DATASET_ERROR when the existence check fails.
     */
    async read(name) {
        try {
            const [rows] = await this.pool.execute('SELECT 1 FROM information_schema.tables ' +
                'WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1', [name]);
            return rows.length > 0;
        }
        catch (error) {
            throw new CustomError({
                name: 'DB_DATASET_ERROR',
                message: `Failed to read MySQL dataset '${name}'`,
                cause: error
            });
        }
    }
    /**
     * Creates one table with the desired schema.
     * @param name - Table name to reconcile.
     * @param desired - Target schema definition.
     * @returns A promise that resolves when creation completes.
     * @throws {CustomError} DB_DATASET_ERROR when table creation fails.
     */
    async create(name, desired) {
        try {
            await this.pool.execute(`CREATE TABLE ${this.pool.escapeId(name)} (${desired.ddl})`);
        }
        catch (error) {
            throw new CustomError({
                name: 'DB_DATASET_ERROR',
                message: `Failed to create MySQL dataset '${name}'`,
                cause: error
            });
        }
    }
    /**
     * Reads one index definition for a table and returns it, or null.
     * @remarks
     * Reconstructs the definition from `information_schema.statistics`, ordering fields by
     * `seq_in_index`, mapping the `D` collation to descending, and treating the index as
     * unique only when every catalog row reports `non_unique = 0`.
     * @param datasetName - Table name that owns the index.
     * @param indexName - Index name to inspect.
     * @returns Existing index definition, or null when absent.
     * @throws {CustomError} DB_DATASET_ERROR when reading the index catalog fails.
     */
    async readIndex(datasetName, indexName) {
        try {
            const [rows] = await this.pool.execute('SELECT column_name, collation, non_unique FROM information_schema.statistics ' +
                'WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? ' +
                'ORDER BY seq_in_index ASC', [datasetName, indexName]);
            if (rows.length === 0) {
                return null;
            }
            return {
                name: indexName,
                fields: rows.map((row) => ({
                    name: String(row.column_name),
                    direction: row.collation === 'D' ? 'desc' : 'asc'
                })),
                unique: rows.every((row) => row.non_unique === 0)
            };
        }
        catch (error) {
            throw new CustomError({
                name: 'DB_DATASET_ERROR',
                message: `Failed to read index '${indexName}' for MySQL dataset '${datasetName}'`,
                cause: error
            });
        }
    }
    /**
     * Creates one table index.
     * @remarks
     * Skips creation silently when the table is missing any indexed column, since the MySQL
     * schema converter does not yet emit entity columns; the index is created once those
     * columns exist.
     * @param datasetName - Table name that owns the index.
     * @param desired - Target index definition.
     * @returns A promise that resolves when creation completes or is skipped.
     * @throws {CustomError} DB_DATASET_ERROR when index creation fails.
     */
    async createIndex(datasetName, desired) {
        try {
            const existingColumns = await this.readColumnNames(datasetName);
            const hasAllColumns = desired.fields.every((field) => existingColumns.has(field.name));
            if (!hasAllColumns) {
                return;
            }
            const uniqueSql = desired.unique ? 'UNIQUE ' : '';
            const columnsSql = desired.fields
                .map((field) => {
                const direction = field.direction === 'asc' ? 'ASC' : 'DESC';
                return `${this.pool.escapeId(field.name)} ${direction}`;
            })
                .join(', ');
            const sql = `CREATE ${uniqueSql}INDEX ${this.pool.escapeId(desired.name)} ` +
                `ON ${this.pool.escapeId(datasetName)} (${columnsSql})`;
            await this.pool.execute(sql);
        }
        catch (error) {
            throw new CustomError({
                name: 'DB_DATASET_ERROR',
                message: `Failed to create index '${desired.name}' for MySQL dataset '${datasetName}'`,
                cause: error
            });
        }
    }
    /**
     * Reads column names for one table.
     * @param datasetName - Table whose columns should be inspected.
     * @returns Set of current column names.
     */
    async readColumnNames(datasetName) {
        const [rows] = await this.pool.execute('SELECT column_name FROM information_schema.columns ' +
            'WHERE table_schema = DATABASE() AND table_name = ?', [datasetName]);
        return new Set(rows.map((row) => String(row.column_name)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlzcWwtZGF0YXNldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9teXNxbC9teXNxbC1kYXRhc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQU8zRDs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLE9BQU8sWUFBWTtJQUtNO0lBSjdCOzs7T0FHRztJQUNILFlBQTZCLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO0lBQUcsQ0FBQztJQUUzQzs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWTtRQUNyQixJQUFJLENBQUM7WUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQXFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBR3RFLDBDQUEwQztnQkFDeEMsNERBQTRELEVBQzlELENBQUMsSUFBSSxDQUFDLENBQ1AsQ0FBQztZQUVGLE9BQU8sSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUFDLE9BQU8sS0FBYyxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLFdBQVcsQ0FBQztnQkFDcEIsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsT0FBTyxFQUFFLGlDQUFpQyxJQUFJLEdBQUc7Z0JBQ2pELEtBQUssRUFBRSxLQUFLO2FBQ2IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVksRUFBRSxPQUFvQjtRQUM3QyxJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUNyQixnQkFBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUM1RCxDQUFDO1FBQ0osQ0FBQztR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