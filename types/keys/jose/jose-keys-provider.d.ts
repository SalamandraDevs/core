import type { CryptoKey } from 'jose';
import type { IKeysProvider } from '../contracts.js';
import type { PublicJwk, SigningKeyHandle } from '../types.js';
import type { JoseSigningKeysConfig } from './types.js';
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
export declare class JoseKeysProvider implements IKeysProvider {
    private readonly config;
    private readonly algorithm;
    /** Built once in initialize(); no rotation means no refresh machinery. */
    private snapshot;
    /**
     * @param config - Validated Jose provider configuration.
     * @param algorithm - JOSE algorithm enforced for the generated key.
     */
    constructor(config: JoseSigningKeysConfig, algorithm: 'ES256');
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
    initialize(): Promise<void>;
    /**
     * Returns a signer bound to the active key.
     *
     * @group Keys
     * @category Key Providers
     * @returns Provider-neutral signing capability.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
     */
    getCurrentSigner(): Promise<SigningKeyHandle>;
    /**
     * Resolves one eligible public key by exact key identifier.
     *
     * @group Keys
     * @category Key Providers
     * @param kid - Key identifier carried with the signature.
     * @returns Public verification key, or null for an unknown key.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
     */
    getPublicKey(kid: string): Promise<CryptoKey | null>;
    /**
     * Lists the public keys eligible for JWKS publication.
     *
     * @group Keys
     * @category Key Providers
     * @returns Retained public JSON Web Keys.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
     */
    listPublicKeys(): Promise<readonly PublicJwk[]>;
    /**
     * Generates the first key and writes it, adopting an existing file when a concurrent
     * start won the race.
     *
     * @param secret - Passphrase that encrypts the key file.
     * @returns The persisted key-file payload.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when the file cannot be written or re-read.
     */
    private createKeyFile;
    /**
     * Generates one active ES256 key and the key-file payload that persists it.
     *
     * @returns Key-file payload with a single active key and its private material.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when the generated key is missing JWK
     *   coordinates.
     */
    private generatePayload;
    /**
     * Validates the payload and publishes the in-process snapshot.
     *
     * @param payload - Key-file payload to project.
     * @returns Completed snapshot publication.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when the state is invalid or a JWK cannot be
     *   imported as an asymmetric key.
     */
    private publishSnapshot;
    /**
     * Returns the snapshot published by initialize().
     *
     * @returns The in-process projection of the signing-key state.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when initialize() has not completed.
     */
    private currentSnapshot;
}
//# sourceMappingURL=jose-keys-provider.d.ts.map