import type { CryptoKey } from 'jose';
import type { IVerificationKeyProvider } from '../contracts.js';
/**
 * Verification keys read from a remote JWKS, such as auth's published key set.
 *
 * @remarks
 * Delegates fetching and caching to `jose`'s remote key set, which refetches on an unknown
 * `kid` after its cooldown. A `kid` the set does not hold resolves to null; a key set that
 * cannot be fetched or parsed is an infrastructure fault.
 * @group Keys
 * @category Key Providers
 */
export declare class JwksVerificationKeyProvider implements IVerificationKeyProvider {
    private readonly jwks;
    /** @param jwksUrl - Absolute URL of the JWKS document. */
    constructor(jwksUrl: string);
    /**
     * Resolves an ES256 public key from the remote key set.
     *
     * @param kid - Key identifier carried with the signature.
     * @returns The public key, or null when the key set has no key with that identifier.
     * @throws {CustomError} EXTERNAL_API_ERROR when the key set cannot be fetched or is
     *   invalid.
     */
    getPublicKey(kid: string): Promise<CryptoKey | null>;
}
//# sourceMappingURL=jwks-verification-key-provider.d.ts.map