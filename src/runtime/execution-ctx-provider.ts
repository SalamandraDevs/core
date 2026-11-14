import { CustomError } from '@salamandradevs/tools/shared';
import type { AsyncLocalStorage } from 'node:async_hooks';

import type { IExecutionCtxProvider } from './contracts.js';
import type { ExecutionContext } from './types.js';

/**
 * Execution context provider backed by a service-owned `AsyncLocalStorage`.
 *
 * @remarks
 * Delegates scope binding to the injected storage, whose context follows every async
 * continuation of the bound callback, and turns a missing store into a classified error so
 * callers never handle `undefined`. The storage is created by the service composition root
 * and passed in, so each process owns exactly one storage and no module-level instance
 * exists.
 * @group Utils
 * @category Execution Context
 */
export class ExecutionCtxProvider implements IExecutionCtxProvider {
  /**
   * Creates a provider over one service-owned storage.
   *
   * @param storage - Async local storage holding the context of the current async scope.
   */
  constructor(private readonly storage: AsyncLocalStorage<ExecutionContext>) {}

  /**
   * Runs one callback with the supplied execution context bound to its async scope.
   *
   * @param context - Execution context for the current request or job.
   * @param callback - Work executed while the context is available.
   * @returns The callback return value.
   */
  run<T>(context: ExecutionContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Reads the execution context bound to the current async scope.
   *
   * @returns The active {@link ExecutionContext}.
   * @throws {CustomError} EXECUTION_CONTEXT_ERROR when called outside a
   *   {@link ExecutionCtxProvider.run} scope.
   */
  get(): ExecutionContext {
    const context: ExecutionContext | undefined = this.storage.getStore();

    if (!context) {
      throw new CustomError({
        name: 'EXECUTION_CONTEXT_ERROR',
        message: 'Execution context is not available',
        cause: 'No execution context is bound to the current async scope'
      });
    }

    return context;
  }
}
