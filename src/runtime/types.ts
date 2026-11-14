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
 * Bound to the async scope by {@link IExecutionCtxProvider.run} and retrieved by
 * {@link IExecutionCtxProvider.get}, so downstream policy code such as {@link RecordsHandler}
 * reads the caller's tenant and actor without threading them through every call.
 * @group Utils
 * @category Execution Context
 */
export type ExecutionContext = Readonly<{
  authenticated: AuthenticatedContext;
  request: RequestContext;
}>;
