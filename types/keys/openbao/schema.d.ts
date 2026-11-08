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
export declare const openBaoSigningKeysConfigSchema: z.ZodObject<{
    transitMount: z.ZodString;
    kvMount: z.ZodString;
    statePath: z.ZodString;
    keyNamePrefix: z.ZodString;
    requestTimeoutMs: z.ZodDefault<z.ZodNumber>;
    refreshCooldownSecs: z.ZodNumber;
    baoAddr: z.ZodURL;
    baoToken: z.ZodString;
}, z.core.$strict>;
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
export declare const openBaoKvReadResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        metadata: z.ZodObject<{
            version: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Transit signing response schema.
 *
 * - Data: JWS-formatted signature returned by Transit.
 */
export declare const openBaoTransitSignResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        signature: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * OpenBao error response schema.
 *
 * - Errors: Sanitized error messages returned by OpenBao.
 */
export declare const openBaoErrorResponseSchema: z.ZodObject<{
    errors: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=schema.d.ts.map