import type { BearerToken, SessionGrant } from './types.js';
/**
 * Access-token verification boundary.
 *
 * @remarks
 * {@link AccessTokenVerifier} is the shipped implementation. A consumer injects it behind
 * this contract, so where the verification keys come from (an owned key set or a remote
 * JWKS) is chosen at the composition root, not by the consumer.
 * @group Tokens
 * @category Access Tokens
 */
export interface IAccessTokenVerifier {
    /**
     * Verifies one bearer access credential.
     *
     * @param credential - Bearer credential selected by the route transport policy.
     * @returns Trusted session grant reconstructed from the credential.
     */
    verify(credential: BearerToken): Promise<SessionGrant>;
}
//# sourceMappingURL=contracts.d.ts.map