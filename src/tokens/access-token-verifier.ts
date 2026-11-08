import { decodeProtectedHeader, jwtVerify } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';
import type { CryptoKey, ProtectedHeaderParameters } from 'jose';

import { accessTokenClaimsSchema } from './schema.js';
import type { IAccessTokenVerifier } from './contracts.js';
import type { AccessTokenClaims } from './types.js';
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
export class AccessTokenVerifier implements IAccessTokenVerifier {
  /**
   * @param config - Issuer, audience, and clock tolerance every token must satisfy.
   * @param keys - Source of public verification keys by `kid`.
   */
  constructor(
    private readonly config: AccessTokenVerifyConfig,
    private readonly keys: IVerificationKeyProvider
  ) {}

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
  async verify(credential: BearerToken): Promise<SessionGrant> {
    try {
      const header: ProtectedHeaderParameters = decodeProtectedHeader(credential.token);

      if (header.kid === undefined || header.alg !== 'ES256' || header.typ !== 'JWT') {
        throw new Error('JWT protected header is invalid');
      }

      const key: CryptoKey | null = await this.keys.getPublicKey(header.kid);

      if (!key) {
        throw new Error('JWT signing key is unknown');
      }

      const { payload } = await jwtVerify(credential.token, key, {
        algorithms: ['ES256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
        clockTolerance: this.config.clockToleranceSecs
      });
      const claims: AccessTokenClaims = accessTokenClaimsSchema.parse(payload);

      return {
        sessionId: claims.sid,
        subject: claims.sub,
        actorId: claims.actorId,
        tenantId: claims.tenantId,
        roles: claims.roles
      };
    } catch (error: unknown) {
      // An infrastructure fault keeps its classification, so a key-source outage is
      // never reported as an invalid credential.
      if (
        error instanceof CustomError &&
        (error.name === 'EXTERNAL_API_ERROR' || error.name === 'CONFIG_ERROR')
      ) {
        throw error;
      }

      throw new CustomError({
        name: 'AUTHENTICATION_FAILED',
        message: 'Credentials verification failed',
        cause: error
      });
    }
  }
}
