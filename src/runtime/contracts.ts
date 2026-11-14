import type { ExecutionContext } from './types.js';

/**
 * Binds and reads the {@link ExecutionContext} of the current request or job.
 *
 * @remarks
 * {@link ExecutionCtxProvider} is the shipped implementation, backed by Node's
 * `AsyncLocalStorage`. The service composition root creates one instance per process and
 * injects it into transport hooks, records handlers, and startup tasks. Matching the
 * signatures is not enough to substitute this contract; every implementation must
 * guarantee:
 *
 * - Propagation: the context bound by `run` is visible to every synchronous and asynchronous
 *   continuation started inside its callback (awaits, timers, event emitters).
 * - Isolation: concurrent `run` scopes never observe each other's context; a shared mutable
 *   "current context" variable violates this and leaks tenants across requests.
 * - Nesting: an inner `run` shadows the outer context, which is restored when the inner
 *   callback returns.
 * - Fail loud: `get` outside any `run` scope throws and never returns a default.
 *
 * @group Utils
 * @category Execution Context
 */
export interface IExecutionCtxProvider {
  /**
   * Runs one callback with the supplied execution context bound to its async scope.
   *
   * @param context - Execution context for the current request or job.
   * @param callback - Work executed while the context is available.
   * @returns The callback return value.
   */
  run<T>(context: ExecutionContext, callback: () => T): T;

  /**
   * Reads the execution context bound to the current async scope.
   *
   * @returns The active {@link ExecutionContext}.
   * @throws {CustomError} EXECUTION_CONTEXT_ERROR when called outside a
   *   {@link IExecutionCtxProvider.run} scope.
   */
  get(): ExecutionContext;
}
