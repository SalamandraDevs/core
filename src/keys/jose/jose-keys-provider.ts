import { randomUUID } from 'node:crypto';

import { exportJWK, generateKeyPair, importJWK } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';
import { loadEnvVariables } from '@salamandradevs/tools/node';
import type { CryptoKey, JWK } from 'jose';

import { readKeyFile, writeKeyFile } from './jose-keyfile.js';
import { joseStorageConfigSchema } from './schema.js';
import { validateSigningKeyState } from '../validation.js';
import type { IKeysProvider } from '../contracts.js';
import type { PublicJwk, SigningKeyHandle } from '../types.js';
import type { SigningKeyState } from '../types.js';
import type { JoseSigningKeysConfig } from './types.js';
import type { KeyFilePayload, PrivateJwk } from './types.js';
import type { SigningKeySnapshot } from './types.js';

/**
 * Node.js-native keys provider that keeps its key set in an encrypted local file.
 *
 * @remarks
 * Generates its own ES256 key on first run and keeps the private material in an encrypted
 * file keyed from the environment, then signs and verifies against that one key set. It
 * fits a small deployment: a single host, or replicas sharing one key file, with the file
 * on a persistent volume and the file and `JOSE_KEYFILE_PASSPHRASE` backed up separately.
 * Compared with {@link OpenBaoKeysProvider}, it accepts that the private key lives in
 * process memory, that replacing the key file reissues every credential it signed, and that
 * no policy layer limits key use; OpenBao is the choice when those costs are not
 * acceptable. It serves one active key and never rotates.
 * @group Keys
 * @category Key Providers
 */
export class JoseKeysProvider implements IKeysProvider {
  /** Built once in initialize(); no rotation means no refresh machinery. */
  private snapshot: SigningKeySnapshot | null = null;

  /**
   * @param config - Validated Jose provider configuration.
   * @param algorithm - JOSE algorithm enforced for the generated key.
   */
  constructor(
    private readonly config: JoseSigningKeysConfig,
    private readonly algorithm: 'ES256'
  ) {}

  /**
   * Loads the encrypted key file and publishes the first snapshot, generating a key on
   * first run when the file is absent.
   *
   * @remarks
   * Hard reset: delete the key file and restart. An absent file re-enters the
   * generate-on-empty path and mints a fresh key, so there is no separate reset operation.
   * The file is read once here, so deleting it while the process runs takes effect only on
   * the next initialize(); the running provider keeps serving the key already in memory.
   * This is a hard reset, not a rotation: the previous kid leaves the published key set at
   * once and every credential it signed stops verifying. A decrypt failure fails loudly and
   * is never treated as an empty file, so a wrong passphrase cannot discard the keys.
   * @group Keys
   * @category Key Providers
   * @returns Completed provider initialization.
   * @throws {CustomError} ENV_VAR_ERROR when the passphrase env variable is unset or blank.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when the file cannot be decrypted or violates
   *   a signing-key invariant.
   */
  async initialize(): Promise<void> {
    // The passphrase is sensitive, so it is read and validated from the environment; the config
    // holds only a placeholder.
    const secret: string = loadEnvVariables(joseStorageConfigSchema).passphrase;

    const existing: KeyFilePayload | null = await readKeyFile(
      this.config.storage.filePath,
      secret
    );
    const payload: KeyFilePayload = existing ?? (await this.createKeyFile(secret));

    await this.publishSnapshot(payload);
  }

  /**
   * Returns a signer bound to the active key.
   *
   * @group Keys
   * @category Key Providers
   * @returns Provider-neutral signing capability.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
   */
  getCurrentSigner(): Promise<SigningKeyHandle> {
    const { activeSigner } = this.currentSnapshot();

    return Promise.resolve({
      kid: activeSigner.kid,
      algorithm: this.algorithm,
      // Web Crypto ECDSA P-256 with SHA-256 returns the raw 64-byte r||s pair, identical to
      // the OpenBao Transit path and to what the JWS signing input expects.
      sign: async (input: Uint8Array): Promise<Uint8Array> => {
        // Copy into a fresh ArrayBuffer-backed view so the Web Crypto BufferSource type is
        // satisfied whatever buffer backs the caller's input.
        const signature: ArrayBuffer = await crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          activeSigner.privateKey,
          new Uint8Array(input)
        );

        return new Uint8Array(signature);
      }
    });
  }

  /**
   * Resolves one eligible public key by exact key identifier.
   *
   * @group Keys
   * @category Key Providers
   * @param kid - Key identifier carried with the signature.
   * @returns Public verification key, or null for an unknown key.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
   */
  getPublicKey(kid: string): Promise<CryptoKey | null> {
    return Promise.resolve(this.currentSnapshot().byKid.get(kid) ?? null);
  }

  /**
   * Lists the public keys eligible for JWKS publication.
   *
   * @group Keys
   * @category Key Providers
   * @returns Retained public JSON Web Keys.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
   */
  listPublicKeys(): Promise<readonly PublicJwk[]> {
    return Promise.resolve(this.currentSnapshot().keys);
  }

  /**
   * Generates the first key and writes it, adopting an existing file when a concurrent
   * start won the race.
   *
   * @param secret - Passphrase that encrypts the key file.
   * @returns The persisted key-file payload.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when the file cannot be written or re-read.
   */
  private async createKeyFile(secret: string): Promise<KeyFilePayload> {
    const payload: KeyFilePayload = await this.generatePayload();
    const created: boolean = await writeKeyFile(
      this.config.storage.filePath,
      secret,
      payload
    );

    if (created) {
      return payload;
    }

    // Another process created the file first; adopt its key rather than minting a second.
    const existing: KeyFilePayload | null = await readKeyFile(
      this.config.storage.filePath,
      secret
    );

    if (!existing) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: `Signing-key file at '${this.config.storage.filePath}' vanished after creation`
      });
    }

    return existing;
  }

  /**
   * Generates one active ES256 key and the key-file payload that persists it.
   *
   * @returns Key-file payload with a single active key and its private material.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when the generated key is missing JWK
   *   coordinates.
   */
  private async generatePayload(): Promise<KeyFilePayload> {
    const { publicKey, privateKey } = await generateKeyPair(this.algorithm, {
      extractable: true
    });
    const publicJwkRaw: JWK = await exportJWK(publicKey);
    const privateJwkRaw: JWK = await exportJWK(privateKey);

    if (!publicJwkRaw.x || !publicJwkRaw.y || !privateJwkRaw.d) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Generated EC key is missing required JWK coordinates'
      });
    }

    const kid: string = `${this.config.keyNamePrefix}-${randomUUID()}`;
    const now: string = new Date().toISOString();
    const publicJwk: PublicJwk = {
      kty: 'EC',
      kid,
      use: 'sig',
      alg: this.algorithm,
      crv: 'P-256',
      x: publicJwkRaw.x,
      y: publicJwkRaw.y
    };
    const privateJwk: PrivateJwk = {
      kty: 'EC',
      crv: 'P-256',
      x: publicJwkRaw.x,
      y: publicJwkRaw.y,
      d: privateJwkRaw.d
    };

    // Build against KeyFilePayload directly: the lifecycle types are read-only projections,
    // while the persisted shape is the mutable schema-inferred one.
    return {
      state: {
        currentKid: kid,
        keys: [
          {
            kid,
            providerKeyId: kid,
            status: 'active',
            publicJwk,
            activateAfter: now,
            activatedAt: now,
            retiredAt: null,
            verifyUntil: null
          }
        ]
      },
      privateJwks: { [kid]: privateJwk }
    };
  }

  /**
   * Validates the payload and publishes the in-process snapshot.
   *
   * @param payload - Key-file payload to project.
   * @returns Completed snapshot publication.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when the state is invalid or a JWK cannot be
   *   imported as an asymmetric key.
   */
  private async publishSnapshot(payload: KeyFilePayload): Promise<void> {
    const state: SigningKeyState = validateSigningKeyState(payload.state, this.algorithm);
    const keys: PublicJwk[] = [];
    const byKid: Map<string, CryptoKey> = new Map<string, CryptoKey>();

    for (const entry of state.keys) {
      const imported: CryptoKey | Uint8Array = await importJWK(
        entry.publicJwk,
        this.algorithm
      );

      // `importJWK` returns bytes for symmetric keys; a published JWK must be asymmetric.
      if (imported instanceof Uint8Array) {
        throw new CustomError({
          name: 'KEYS_PROVIDER_ERROR',
          message: 'Signing-key state contains a non-public JWK'
        });
      }

      keys.push(entry.publicJwk);
      byKid.set(entry.kid, imported);
    }

    const activeKid: string | null = state.currentKid;

    if (activeKid === null || !(activeKid in payload.privateJwks)) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Signing-key file has no private key for the active key'
      });
    }

    const privateJwk: PrivateJwk = payload.privateJwks[activeKid];
    const privateKey: CryptoKey | Uint8Array = await importJWK(
      privateJwk,
      this.algorithm
    );

    if (privateKey instanceof Uint8Array) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Signing-key file contains a non-EC private JWK'
      });
    }

    // Single assignment, so readers move from no snapshot to one complete snapshot.
    this.snapshot = {
      state,
      keys,
      byKid,
      activeSigner: { kid: activeKid, privateKey }
    };
  }

  /**
   * Returns the snapshot published by initialize().
   *
   * @returns The in-process projection of the signing-key state.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
   */
  private currentSnapshot(): SigningKeySnapshot {
    // Built once in initialize() and never refreshed, so a missing snapshot means the provider
    // was used before initialize() completed.
    if (!this.snapshot) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Signing-key snapshot is unavailable; initialize() has not completed'
      });
    }

    return this.snapshot;
  }
}
