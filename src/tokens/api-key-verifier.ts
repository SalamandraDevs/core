import { CustomError } from '@salamandradevs/tools/shared';
import type { CryptoKey } from 'jose';

import { apiKeyPayloadSchema } from './schema.js';
import type { IApiKeyVerifier } from './contracts.js';
import type { ApiKeyPayload, ApiKeyVerifyConfig } from './types.js';
import type { IVerificationKeyProvider } from '../keys/contracts.js';

/** Characters allowed in a base64url key segment (payload and signature). */
const base64UrlPattern: RegExp = /^[A-Za-z0-9_-]+$/;

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
export class ApiKeyVerifier implements IApiKeyVerifier {
  /**
   * @param config - Key prefix and length ceiling shared with the issuer.
   * @param keys - Source of public verification keys by `kid`.
   */
  constructor(
    private readonly config: ApiKeyVerifyConfig,
    private readonly keys: IVerificationKeyProvider
  ) {}

  /**
   * Verifies a key's structure, signature, and expiry, returning its payload.
   *
   * @param key - Value of the `x-api-key` header.
   * @returns The verified key payload.
   * @throws {CustomError} AUTHENTICATION_FAILED when the key is malformed, forged, signed
   *   by an unknown key, or expired.
   */
  async verify(key: string): Promise<ApiKeyPayload> {
    // Shed oversized input before any slicing, decoding, or crypto; a real key is far
    // shorter than this ceiling, so this never rejects a valid key.
    if (key.length > this.config.maxLength) {
      throw new CustomError({
        name: 'AUTHENTICATION_FAILED',
        message: 'Invalid API key'
      });
    }

    const keyParts: string[] = key.startsWith(this.config.prefix)
      ? key.slice(this.config.prefix.length).split('.')
      : [];

    const [encodedPayload, signature] = keyParts;

    // Require exactly two non-empty base64url segments before decoding the payload;
    // base64url decoding is lenient and would not catch stray characters on its own.
    if (
      keyParts.length !== 2 ||
      !encodedPayload ||
      !signature ||
      !base64UrlPattern.test(encodedPayload) ||
      !base64UrlPattern.test(signature)
    ) {
      throw new CustomError({
        name: 'AUTHENTICATION_FAILED',
        message: 'Invalid API key'
      });
    }

    // The payload is read before the signature check only to find the key by `kid`.
    const payload: ApiKeyPayload = this.decodePayload(encodedPayload);
    const verificationKey: CryptoKey | null = await this.keys.getPublicKey(payload.kid);

    const isSigned: boolean =
      verificationKey !== null &&
      (await this.verifySignature(verificationKey, signature, encodedPayload));

    if (!isSigned || payload.exp * 1000 <= Date.now()) {
      throw new CustomError({
        name: 'AUTHENTICATION_FAILED',
        message: 'Invalid API key'
      });
    }

    return payload;
  }

  /**
   * Decodes and validates a base64url payload.
   *
   * @param encodedPayload - Base64url payload segment of the key.
   * @returns The validated payload.
   * @throws {CustomError} AUTHENTICATION_FAILED when the payload cannot be decoded or fails
   *   validation.
   */
  private decodePayload(encodedPayload: string): ApiKeyPayload {
    try {
      const decoded: string = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const parsed: unknown = JSON.parse(decoded);

      return apiKeyPayloadSchema.parse(parsed);
    } catch (error: unknown) {
      throw new CustomError({
        name: 'AUTHENTICATION_FAILED',
        message: 'Invalid API key',
        cause: error
      });
    }
  }

  /**
   * Checks the ES256 signature over the prefixed payload segment.
   *
   * @param verificationKey - Public key resolved by `kid`.
   * @param signature - Base64url signature segment.
   * @param encodedPayload - Base64url payload segment.
   * @returns True when the signature is valid.
   * @throws {CustomError} AUTHENTICATION_FAILED when WebCrypto rejects the key or input.
   */
  private async verifySignature(
    verificationKey: CryptoKey,
    signature: string,
    encodedPayload: string
  ): Promise<boolean> {
    try {
      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        verificationKey,
        Buffer.from(signature, 'base64url'),
        new TextEncoder().encode(`${this.config.prefix}${encodedPayload}`)
      );
    } catch (error: unknown) {
      // The caller picks the `kid`, so a key WebCrypto cannot use for ES256 is an invalid
      // credential, not a server fault.
      throw new CustomError({
        name: 'AUTHENTICATION_FAILED',
        message: 'Invalid API key',
        cause: error
      });
    }
  }
}
