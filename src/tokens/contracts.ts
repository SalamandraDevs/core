import type { ApiKeyPayload, BearerToken, SessionGrant } from './types.js';

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

/**
 * API key verification boundary.
 *
 * @remarks
 * {@link ApiKeyVerifier} is the shipped implementation. It checks a key's structure,
 * signature, and expiry and returns its payload; it makes no revocation decision, which
 * belongs to the consuming service.
 * @group Tokens
 * @category API Keys
 */
export interface IApiKeyVerifier {
  /**
   * Verifies a key's structure, signature, and expiry, returning its payload.
   *
   * @param key - Value of the `x-api-key` header.
   * @returns The verified key payload.
   */
  verify(key: string): Promise<ApiKeyPayload>;
}
