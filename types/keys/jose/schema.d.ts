import { z } from 'zod';
/**
 * Jose key-file storage schema.
 *
 * - FilePath: Path to the encrypted key file; must be listed in `.gitignore`.
 * - Passphrase: Encrypted key-file passphrase; a secret, read from `JOSE_KEYFILE_PASSPHRASE`.
 *
 * @remarks
 * `passphrase` is marked `.meta({ env })`, so `loadEnvVariables` resolves it from
 * `JOSE_KEYFILE_PASSPHRASE`; the configuration file holds only a placeholder.
 */
export declare const joseStorageConfigSchema: z.ZodObject<{
    filePath: z.ZodString;
    passphrase: z.ZodString;
}, z.core.$strict>;
/**
 * Jose provider configuration and local-storage schema.
 *
 * - KeyNamePrefix: Prefix for the generated `kid` and provider key identifier.
 * - Storage: Encrypted key-file location and passphrase source.
 *
 * @remarks
 * Self-contained so the provider directory owns its whole storage story without the factory
 * ever handling a file path or a secret.
 */
export declare const joseSigningKeysConfigSchema: z.ZodObject<{
    keyNamePrefix: z.ZodString;
    storage: z.ZodObject<{
        filePath: z.ZodString;
        passphrase: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
/**
 * EC P-256 private JWK persisted in the encrypted key file.
 *
 * - Kty: Key type, always `EC`.
 * - Crv: Curve, always `P-256`.
 * - X: Public x coordinate.
 * - Y: Public y coordinate.
 * - D: Private scalar; the secret half, which is why the file is encrypted at rest.
 */
export declare const privateJwkSchema: z.ZodObject<{
    kty: z.ZodLiteral<"EC">;
    crv: z.ZodLiteral<"P-256">;
    x: z.ZodString;
    y: z.ZodString;
    d: z.ZodString;
}, z.core.$strict>;
/**
 * Decrypted key-file payload.
 *
 * - State: Signing-key lifecycle document shared with every provider.
 * - PrivateJwks: Private signing material indexed by `kid`.
 */
export declare const keyFilePayloadSchema: z.ZodObject<{
    state: z.ZodObject<{
        currentKid: z.ZodNullable<z.ZodString>;
        keys: z.ZodArray<z.ZodObject<{
            kid: z.ZodString;
            providerKeyId: z.ZodString;
            status: z.ZodEnum<{
                pending: "pending";
                active: "active";
                retired: "retired";
            }>;
            publicJwk: z.ZodObject<{
                kty: z.ZodString;
                kid: z.ZodString;
                use: z.ZodOptional<z.ZodString>;
                alg: z.ZodOptional<z.ZodString>;
                crv: z.ZodOptional<z.ZodString>;
                x: z.ZodOptional<z.ZodString>;
                y: z.ZodOptional<z.ZodString>;
                n: z.ZodOptional<z.ZodString>;
                e: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            activateAfter: z.ZodPipe<z.ZodString, z.ZodISODateTime>;
            activatedAt: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodISODateTime>>;
            retiredAt: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodISODateTime>>;
            verifyUntil: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodISODateTime>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    privateJwks: z.ZodRecord<z.ZodString, z.ZodObject<{
        kty: z.ZodLiteral<"EC">;
        crv: z.ZodLiteral<"P-256">;
        x: z.ZodString;
        y: z.ZodString;
        d: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
//# sourceMappingURL=schema.d.ts.map