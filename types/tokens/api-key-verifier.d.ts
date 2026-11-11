import type { IApiKeyVerifier } from './contracts.js';
import type { ApiKeyPayload, ApiKeyVerifyConfig } from './types.js';
import type { IVerificationKeyProvider } from '../keys/contracts.js';
/**
 * Verifies a compact API key's structure, signature, and expiry.
 *
 * @remarks
 * Applies the cheap structural gates first (the configured length ceiling and prefix, two
 * base64url segments), decodes the payload with {@link apiKeyPayloadSchema}, resolves the
 * public key by `kid` through the injected {@link IVerificationKeyProvider}, checks the
 * ES256 signature over `<prefix><payload>`, and rejects an expired key. Key-provider faults
 * propagate unchanged, so an outage is never reported as an invalid key.
 * @group Tokens
 * @category API Keys
 */
export declare class ApiKeyVerifier implements IApiKeyVerifier {
    private readonly config;
    private readonly keys;
    /**
     * @param config - Key prefix and length ceiling shared with the issuer.
     * @param keys - Source of public verification keys by `kid`.
     */
    constructor(config: ApiKeyVerifyConfig, keys: IVerificationKeyProvider);
    /**
     * Verifies a key's structure, signature, and expiry, returning its payload.
     *
     * @param key - Value of the `x-api-key` header.
     * @returns The verified key payload.
     * @throws {CustomError} AUTHENTICATION_FAILED when the key is malformed, forged, signed
     *   by an unknown key, or expired.
     */
    verify(key: string): Promise<ApiKeyPayload>;
    /**
     * Decodes and validates a base64url payload.
     *
     * @param encodedPayload - Base64url payload segment of the key.
     * @returns The validated payload.
     * @throws {CustomError} AUTHENTICATION_FAILED when the payload cannot be decoded or fails
     *   validation.
     */
    private decodePayload;
    /**
     * Checks the ES256 signature over the prefixed payload segment.
     *
     * @param verificationKey - Public key resolved by `kid`.
     * @param signature - Base64url signature segment.
     * @param encodedPayload - Base64url payload segment.
     * @returns True when the signature is valid.
     * @throws {CustomError} AUTHENTICATION_FAILED when WebCrypto rejects the key or input.
     */
    private verifySignature;
}
//# sourceMappingURL=api-key-verifier.d.ts.map