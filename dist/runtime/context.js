import { CustomError } from '@salamandradevs/tools/shared';
import { AsyncLocalStorage } from 'node:async_hooks';
// Async local storage backing the ambient execution context for the current async scope.
const executionContextStorage = new AsyncLocalStorage();
/**
 * Runs one callback with the supplied execution context bound to the current async scope.
 *
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
 *
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydW50aW1lL2NvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBOENyRCx5RkFBeUY7QUFDekYsTUFBTSx1QkFBdUIsR0FDM0IsSUFBSSxpQkFBaUIsRUFBb0IsQ0FBQztBQUU1Qzs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUFJLE9BQXlCLEVBQUUsUUFBaUI7SUFDakYsT0FBTyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxlQUFlO0lBQzdCLE1BQU0sT0FBTyxHQUFpQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUVqRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLElBQUksV0FBVyxDQUFDO1lBQ3BCLElBQUksRUFBRSxvQkFBb0I7WUFDMUIsT0FBTyxFQUFFLG9DQUFvQztZQUM3QyxLQUFLLEVBQUUseURBQXlEO1NBQ2pFLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDIn0=