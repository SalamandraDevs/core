import type { CryptoKey } from 'jose';

import type { PublicJwk, SigningKeyHandle } from './types.js';

/**
 * Owner of a key set that signs with it and lists its public keys.
 *
 * @remarks
 * {@link JoseKeysProvider} and {@link OpenBaoKeysProvider} are the shipped implementations,
 * each over the key set it owns. A consumer that only issues signatures depends on this
 * role, never on {@link IVerificationKeyProvider} or {@link IKeysProvider}.
 * @group Keys
 * @category Key Providers
 */
export interface ISigningKeyProvider {
  /** Loads durable state and ensures that an active key exists. */
  initialize(): Promise<void>;

  /** Returns a signer bound to the active key. */
  getCurrentSigner(): Promise<SigningKeyHandle>;

  /** Lists public keys eligible for JWKS publication. */
  listPublicKeys(): Promise<readonly PublicJwk[]>;
}

/**
 * Source of public keys that verify signatures, looked up by key identifier.
 *
 * @remarks
 * {@link JoseKeysProvider} and {@link OpenBaoKeysProvider} implement it over the key set they
 * own, next to {@link ISigningKeyProvider}; {@link JwksVerificationKeyProvider} implements it
 * over a remote JWKS.
 * @group Keys
 * @category Key Providers
 */
export interface IVerificationKeyProvider {
  /**
   * Resolves an eligible public verification key by exact key identifier.
   *
   * @param kid - Key identifier carried with the signature.
   * @returns The public key, or null when no eligible key has that identifier.
   */
  getPublicKey(kid: string): Promise<CryptoKey | null>;
}

/**
 * Owner of a key set, which signs with it and verifies against it.
 *
 * @remarks
 * Adds no members: it names the class the composition root builds once, which then hands
 * each consumer only {@link ISigningKeyProvider} or {@link IVerificationKeyProvider}.
 * {@link JoseKeysProvider} and {@link OpenBaoKeysProvider} are the shipped implementations.
 * @group Keys
 * @category Key Providers
 */
export interface IKeysProvider extends ISigningKeyProvider, IVerificationKeyProvider {}
