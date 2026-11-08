import { z } from 'zod';
/**
 * Public JSON Web Key material schema.
 *
 * - Kty: Key type.
 * - Kid: Public key identifier.
 * - Use: Optional intended key use.
 * - Alg: Optional JOSE algorithm.
 * - Crv: Optional elliptic curve name.
 * - X: Optional elliptic-curve or RSA coordinate.
 * - Y: Optional elliptic-curve coordinate.
 * - N: Optional RSA modulus.
 * - E: Optional RSA exponent.
 *
 * @remarks
 * Provider-neutral: this is the public key as served to every key consumer, so it carries
 * no provider-specific fields. Shared across every signing-key provider so each validates
 * the lifecycle document against one definition.
 * @group Keys
 * @category Key Providers
 */
export declare const publicJwkSchema: z.ZodObject<{
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
/**
 * Durable signing-key lifecycle document schema.
 *
 * - CurrentKid: Identifier of the sole active key.
 * - Keys: Complete provider-managed key lifecycle.
 *
 * @remarks
 * The neutral contract every provider's durable store must satisfy. Behavioural invariants
 * beyond this shape (exactly one active key, status-consistent timestamps) live in
 * {@link validateSigningKeyState}.
 * @group Keys
 * @category Key Providers
 */
export declare const signingKeyStateSchema: z.ZodObject<{
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
//# sourceMappingURL=schema.d.ts.map