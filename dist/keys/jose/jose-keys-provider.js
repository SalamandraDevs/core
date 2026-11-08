import { randomUUID } from 'node:crypto';
import { exportJWK, generateKeyPair, importJWK } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';
import { loadEnvVariables } from '@salamandradevs/tools/node';
import { readKeyFile, writeKeyFile } from './jose-keyfile.js';
import { joseStorageConfigSchema } from './schema.js';
import { validateSigningKeyState } from '../validation.js';
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
export class JoseKeysProvider {
    config;
    algorithm;
    /** Built once in initialize(); no rotation means no refresh machinery. */
    snapshot = null;
    /**
     * @param config - Validated Jose provider configuration.
     * @param algorithm - JOSE algorithm enforced for the generated key.
     */
    constructor(config, algorithm) {
        this.config = config;
        this.algorithm = algorithm;
    }
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
    async initialize() {
        // The passphrase is sensitive, so it is read and validated from the environment; the config
        // holds only a placeholder.
        const secret = loadEnvVariables(joseStorageConfigSchema).passphrase;
        const existing = await readKeyFile(this.config.storage.filePath, secret);
        const payload = existing ?? (await this.createKeyFile(secret));
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
    getCurrentSigner() {
        const { activeSigner } = this.currentSnapshot();
        return Promise.resolve({
            kid: activeSigner.kid,
            algorithm: this.algorithm,
            // Web Crypto ECDSA P-256 with SHA-256 returns the raw 64-byte r||s pair, identical to
            // the OpenBao Transit path and to what the JWS signing input expects.
            sign: async (input) => {
                // Copy into a fresh ArrayBuffer-backed view so the Web Crypto BufferSource type is
                // satisfied whatever buffer backs the caller's input.
                const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, activeSigner.privateKey, new Uint8Array(input));
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
    getPublicKey(kid) {
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
    listPublicKeys() {
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
    async createKeyFile(secret) {
        const payload = await this.generatePayload();
        const created = await writeKeyFile(this.config.storage.filePath, secret, payload);
        if (created) {
            return payload;
        }
        // Another process created the file first; adopt its key rather than minting a second.
        const existing = await readKeyFile(this.config.storage.filePath, secret);
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
    async generatePayload() {
        const { publicKey, privateKey } = await generateKeyPair(this.algorithm, {
            extractable: true
        });
        const publicJwkRaw = await exportJWK(publicKey);
        const privateJwkRaw = await exportJWK(privateKey);
        if (!publicJwkRaw.x || !publicJwkRaw.y || !privateJwkRaw.d) {
            throw new CustomError({
                name: 'KEYS_PROVIDER_ERROR',
                message: 'Generated EC key is missing required JWK coordinates'
            });
        }
        const kid = `${this.config.keyNamePrefix}-${randomUUID()}`;
        const now = new Date().toISOString();
        const publicJwk = {
            kty: 'EC',
            kid,
            use: 'sig',
            alg: this.algorithm,
            crv: 'P-256',
            x: publicJwkRaw.x,
            y: publicJwkRaw.y
        };
        const privateJwk = {
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
    async publishSnapshot(payload) {
        const state = validateSigningKeyState(payload.state, this.algorithm);
        const keys = [];
        const byKid = new Map();
        for (const entry of state.keys) {
            const imported = await importJWK(entry.publicJwk, this.algorithm);
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
        const activeKid = state.currentKid;
        if (activeKid === null || !(activeKid in payload.privateJwks)) {
            throw new CustomError({
                name: 'KEYS_PROVIDER_ERROR',
                message: 'Signing-key file has no private key for the active key'
            });
        }
        const privateJwk = payload.privateJwks[activeKid];
        const privateKey = await importJWK(privateJwk, this.algorithm);
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
    currentSnapshot() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiam9zZS1rZXlzLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2tleXMvam9zZS9qb3NlLWtleXMtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUV6QyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBUTNEOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBTSxPQUFPLGdCQUFnQjtJQVNSO0lBQ0E7SUFUbkIsMEVBQTBFO0lBQ2xFLFFBQVEsR0FBOEIsSUFBSSxDQUFDO0lBRW5EOzs7T0FHRztJQUNILFlBQ21CLE1BQTZCLEVBQzdCLFNBQWtCO1FBRGxCLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLGNBQVMsR0FBVCxTQUFTLENBQVM7SUFDbEMsQ0FBQztJQUVKOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSCxLQUFLLENBQUMsVUFBVTtRQUNkLDRGQUE0RjtRQUM1Riw0QkFBNEI7UUFDNUIsTUFBTSxNQUFNLEdBQVcsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFFNUUsTUFBTSxRQUFRLEdBQTBCLE1BQU0sV0FBVyxDQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQzVCLE1BQU0sQ0FDUCxDQUFD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