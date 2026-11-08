import { z } from 'zod';

/**
 * OpenBao key namespace, request policy, and connection schema.
 *
 * - TransitMount: Transit secrets-engine mount.
 * - KvMount: KV v2 secrets-engine mount.
 * - StatePath: KV path containing lifecycle state.
 * - KeyNamePrefix: Prefix for provider-managed Transit keys.
 * - RequestTimeoutMs: Deadline applied to every OpenBao HTTP request.
 * - RefreshCooldownSecs: Minimum time between two re-reads of the lifecycle document
 *   triggered by an unknown `kid`.
 * - BaoAddr: OpenBao origin without embedded credentials; read from `BAO_ADDR`.
 * - BaoToken: Runtime OpenBao token; a secret, read from `BAO_TOKEN`.
 *
 * @remarks
 * `baoAddr` and `baoToken` are marked `.meta({ env })`, so `loadEnvVariables` resolves them
 * from `BAO_ADDR` and `BAO_TOKEN` and hands the values to the provider; the configuration
 * file holds only placeholders, so the token never appears in the config object.
 */
export const openBaoSigningKeysConfigSchema = z
  .object({
    transitMount: z.string().min(1),
    kvMount: z.string().min(1),
    statePath: z.string().min(1),
    keyNamePrefix: z.string().min(1),
    requestTimeoutMs: z.number().int().positive().default(10_000),
    refreshCooldownSecs: z.number().int().positive(),
    baoAddr: z.url({ error: 'is required and must be a URL' }).meta({ env: 'BAO_ADDR' }),
    baoToken: z
      .string({ error: 'is required' })
      .min(1, 'must not be empty')
      .meta({ env: 'BAO_TOKEN' })
  })
  .strict();

/**
 * KV v2 lifecycle-state read response schema.
 *
 * - Data: KV envelope carrying the stored document and its version metadata.
 *
 * @remarks
 * OpenBao wraps every logical response in an envelope carrying `request_id`, `lease_id`,
 * `lease_duration`, `renewable`, `warnings`, `wrap_info`, `auth` and `mount_type`, and the
 * version metadata adds `created_time`, `custom_metadata`, `deletion_time` and `destroyed`.
 * None of these response schemas may be `strict`, because those unmodelled fields are
 * always present. Verified against OpenBao 2.7.0.
 */
export const openBaoKvReadResponseSchema = z.object({
  data: z.object({
    data: z.record(z.string(), z.unknown()),
    metadata: z.object({ version: z.number().int().positive() })
  })
});

/**
 * Transit signing response schema.
 *
 * - Data: JWS-formatted signature returned by Transit.
 */
export const openBaoTransitSignResponseSchema = z.object({
  data: z.object({ signature: z.string().min(1) })
});

/**
 * OpenBao error response schema.
 *
 * - Errors: Sanitized error messages returned by OpenBao.
 */
export const openBaoErrorResponseSchema = z.object({ errors: z.array(z.string()) });
