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
 * Development placeholder until API middleware establishes real execution context.
 */
export const dummyExecutionCtx: ExecutionContext = {
  authenticated: {
    actorId: 'development-actor',
    tenantId: 'development-tenant'
  },
  request: {
    requestId: 'development-request'
  }
};

/**
 * Error thrown when policy code runs outside an established execution context.
 */
export class MissingExecutionContextError extends Error {
  /**
   * Creates a missing execution context error.
   */
  constructor() {
    super('Execution context is not available');
    this.name = 'MissingExecutionContextError';
  }
}

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
    throw new MissingExecutionContextError();
  }

  return context;
}
