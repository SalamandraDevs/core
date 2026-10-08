import { CustomError } from '@slmdevs/tools/shared';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Trusted authenticated request identity.
 *
 * - ActorId: Authenticated actor attributed as the author of record mutations.
 * - TenantId: Tenant boundary scoping every record operation.
 *
 * @group Utils
 * @category Execution Context
 */
export type AuthenticatedContext = Readonly<{
  actorId: string;
  tenantId: string;
}>;

/**
 * Per-request tracing metadata.
 *
 * - RequestId: Correlation identifier carried through logs for one request or job.
 *
 * @group Utils
 * @category Execution Context
 */
export type RequestContext = Readonly<{
  requestId: string;
}>;

/**
 * Request-scoped execution metadata established by transport middleware.
 *
 * - Authenticated: Trusted identity for the current request or job.
 * - Request: Tracing metadata for the current request or job.
 *
 * @remarks
 * Bound to the async scope by {@link runWithExecutionCtx} and retrieved by
 * {@link getExecutionCtx}, so downstream policy code such as {@link RecordsHandler} reads the
 * caller's tenant and actor without threading them through every call.
 * @group Utils
 * @category Execution Context
 */
export type ExecutionContext = Readonly<{
  authenticated: AuthenticatedContext;
  request: RequestContext;
}>;

// Async local storage backing the ambient execution context for the current async scope.
const executionContextStorage: AsyncLocalStorage<ExecutionContext> =
  new AsyncLocalStorage<ExecutionContext>();

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
export function runWithExecutionCtx<T>(context: ExecutionContext, callback: () => T): T {
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
