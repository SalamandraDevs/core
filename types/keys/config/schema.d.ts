import { z } from 'zod';
/**
 * Supported signing-key provider identifiers; grows as new providers are added.
 *
 * @group Keys
 * @category Key Providers
 */
export declare const signingKeyProviderSchema: z.ZodEnum<{
    jose: "jose";
    openbao: "openbao";
}>;
/**
 * Signing-key provider selector resolved from the environment.
 *
 * - Provider: Active signing-key provider; read from `SIGNING_KEY_PROVIDER`.
 *
 * @remarks
 * `provider` is marked `.meta({ env })`, so `loadEnvVariables` resolves it from
 * `SIGNING_KEY_PROVIDER`; the active provider is chosen at runtime, never baked into the
 * configuration file.
 * @group Keys
 * @category Key Providers
 */
export declare const signingKeyProviderSelectorSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        jose: "jose";
        openbao: "openbao";
    }>;
}, z.core.$strict>;
/**
 * Provider-neutral signing lifecycle schema.
 *
 * - Algorithm: JOSE algorithm supported by this key set.
 * - Jose: Jose provider configuration, present when the deployment may select `jose`.
 * - Openbao: OpenBao provider configuration, present when the deployment may select
 *   `openbao`.
 *
 * @remarks
 * Each provider block is optional so a deployment configures only the providers it uses;
 * the active one is chosen at runtime by `SIGNING_KEY_PROVIDER` and must have its block
 * present. Composed into each service's own `serviceConfigSchema` and validated there; core
 * never reads a configuration file.
 * @group Keys
 * @category Key Providers
 */
export declare const signingKeysConfigSchema: z.ZodObject<{
    algorithm: z.ZodLiteral<"ES256">;
    jose: z.ZodOptional<z.ZodObject<{
        keyNamePrefix: z.ZodString;
        storage: z.ZodObject<{
            filePath: z.ZodString;
            passphrase: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    openbao: z.ZodOptional<z.ZodObject<{
        transitMount: z.ZodString;
        kvMount: z.ZodString;
        statePath: z.ZodString;
        keyNamePrefix: z.ZodString;
        requestTimeoutMs: z.ZodDefault<z.ZodNumber>;
        refreshCooldownSecs: z.ZodNumber;
        baoAddr: z.ZodURL;
        baoToken: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
//# sourceMappingURL=schema.d.ts.map