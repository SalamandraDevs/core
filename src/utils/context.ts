import { CustomError } from '@slmdevs/tools/shared';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Trusted authenticated request identity.
 */
export type AuthenticatedContext = Readonly<{
  actorId: string;
  tenantId: string;
}>;

/**
 * Per-request tracing metadata.
 */
export type RequestContext = Readonly<{
  requestId: string;
}>;

/**
 * Request-scoped execution metadata established by transport middleware.
 */
export type ExecutionContext = Readonly<{
  authenticated: AuthenticatedContext;
  request: RequestContext;
}>;

/**
 * Declares an async local storage to handle the execution context.
 */
const executionContextStorage: AsyncLocalStorage<ExecutionContext> =
  new AsyncLocalStorage<ExecutionContext>();

/**
 * Runs one callback with the supplied execution context bound to the current async scope.
 * @param context - Execution context for the current request or job.
 * @param callback - Work executed while the context is available.
 * @returns - The callback return value.
 */
export function runWithExecutionCtx<T>(context: ExecutionContext, callback: () => T): T {
  return executionContextStorage.run(context, callback);
}

/**
 * Reads the current execution context.
 * @returns - Active execution context for the current async scope.
 * @throws {MissingExecutionContextError} When no execution context is bound.
 */
export function getExecutionCtx(): ExecutionContext {
  const context: ExecutionContext | undefined = executionContextStorage.getStore();

  if (!context) {
    throw new CustomError({
      name: 'RESOURCE_NOT_FOUND',
      message: 'Execution context is not available',
      cause: 'Async local storage could not get the execution context'
    });
  }

  return context;
}
