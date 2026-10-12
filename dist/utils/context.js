import { CustomError } from '@salamandradevs/tools/shared';
import { AsyncLocalStorage } from 'node:async_hooks';
// Async local storage backing the ambient execution context for the current async scope.
const executionContextStorage = new AsyncLocalStorage();
/**
 * Runs one callback with the supplied execution context bound to the current async scope.
 * @remarks
 * The context is visible to every asynchronous operation started within `callback` and is
 * torn down when it returns, so nested calls to {@link getExecutionCtx} resolve the same
 * identity without explicit propagation. Transport middleware wraps request handling in
 * this call.
 * @group Utils
 * @category Execution Context
 * @param context - Execution context for the current request or job.
 * @param callback - Work executed while the context is available.
 * @returns The callback return value.
 */
export function runWithExecutionCtx(context, callback) {
    return executionContextStorage.run(context, callback);
}
/**
 * Reads the current execution context.
 * @group Utils
 * @category Execution Context
 * @returns The active {@link ExecutionContext} for the current async scope.
 * @throws {CustomError} RESOURCE_NOT_FOUND when called outside a {@link runWithExecutionCtx}
 *   scope, so no context is bound.
 */
export function getExecutionCtx() {
    const context = executionContextStorage.getStore();
    if (!context) {
        throw new CustomError({
            name: 'RESOURCE_NOT_FOUND',
            message: 'Execution context is not available',
            cause: 'Async local storage could not get the execution context'
        });
    }
    return context;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQTJDckQseUZBQXlGO0FBQ3pGLE1BQU0sdUJBQXVCLEdBQzNCLElBQUksaUJBQWlCLEVBQW9CLENBQUM7QUFFNUM7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUFJLE9BQXlCLEVBQUUsUUFBaUI7SUFDakYsT0FBTyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGVBQWU7SUFDN0IsTUFBTSxPQUFPLEdBQWlDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRWpGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLE1BQU0sSUFBSSxXQUFXLENBQUM7WUFDcEIsSUFBSSxFQUFFLG9CQUFvQjtZQUMxQixPQUFPLEVBQUUsb0NBQW9DO1lBQzdDLEtBQUssRUFBRSx5REFBeUQ7U0FDakUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMifQ==