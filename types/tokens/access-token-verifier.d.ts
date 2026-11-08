import type { IAccessTokenVerifier } from './contracts.js';
import type { AccessTokenVerifyConfig } from './types.js';
import type { BearerToken } from './types.js';
import type { SessionGrant } from './types.js';
import type { IVerificationKeyProvider } from '../keys/contracts.js';
/**
 * Verifies platform access tokens and reconstructs their session grant.
 *
 * @remarks
 * Checks the protected header, resolves the public key by `kid` through the injected
 * {@link IVerificationKeyProvider}, verifies signature, issuer, audience, and expiry with
 * `jose`, then parses the claims with {@link accessTokenClaimsSchema}.
 * @group Tokens
 * @category Access Tokens
 */
export declare class AccessTokenVerifier implements IAccessTokenVerifier {
    private readonly config;
    private readonly keys;
    /**
     * @param config - Issuer, audience, and clock tolerance every token must satisfy.
     * @param keys - Source of public verification keys by `kid`.
     */
    constructor(config: AccessTokenVerifyConfig, keys: IVerificationKeyProvider);
    /**
     * Verifies one bearer access token.
     *
     * @param credential - Bearer credential selected by the transport layer.
     * @returns Trusted session grant read from the token claims.
     * @throws {CustomError} AUTHENTICATION_FAILED when the token is malformed, signed by an
     *   unknown key, expired, or carries incomplete claims.
     * @throws {CustomError} EXTERNAL_API_ERROR or CONFIG_ERROR when the key provider fails;
     *   propagated unchanged.
     */
    verify(credential: BearerToken): Promise<SessionGrant>;
}
//# sourceMappingURL=access-token-verifier.d.ts.map