/** Public JSON Web Key material. */
export type PublicJwk = Readonly<{
    kty: string;
    kid: string;
    use?: string;
    alg?: string;
    crv?: string;
    x?: string;
    y?: string;
    n?: string;
    e?: string;
}>;
/** Signing capability bound to one provider-managed key. */
export type SigningKeyHandle = Readonly<{
    kid: string;
    algorithm: 'ES256';
    sign: (input: Uint8Array) => Promise<Uint8Array>;
}>;
/** Lifecycle state of a provider-managed signing key. */
export type SigningKeyStatus = 'pending' | 'active' | 'retired';
/**
 * Durable metadata for one provider-managed signing key.
 *
 * - Kid: Public identifier carried with each signature.
 * - ProviderKeyId: Opaque provider-owned key identifier.
 * - Status: Current lifecycle status.
 * - PublicJwk: Public verification key published through JWKS.
 * - ActivateAfter: Earliest time when a pending key may become active.
 * - ActivatedAt: Activation time, or null while pending.
 * - RetiredAt: Retirement time, or null while active or pending.
 * - VerifyUntil: Verification end time, or null while not retired.
 */
export type SigningKeyEntry = Readonly<{
    kid: string;
    providerKeyId: string;
    status: SigningKeyStatus;
    publicJwk: PublicJwk;
    activateAfter: string;
    activatedAt: string | null;
    retiredAt: string | null;
    verifyUntil: string | null;
}>;
/**
 * Durable lifecycle state shared by the replicas that own one key set.
 *
 * - CurrentKid: Identifier of the sole active key.
 * - Keys: Complete provider-managed key lifecycle.
 */
export type SigningKeyState = Readonly<{
    currentKid: string | null;
    keys: readonly SigningKeyEntry[];
}>;
//# sourceMappingURL=types.d.ts.map