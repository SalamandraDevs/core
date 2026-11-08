import type { CryptoKey } from 'jose';
import type { IKeysProvider } from '../contracts.js';
import type { PublicJwk, SigningKeyHandle } from '../types.js';
import type { OpenBaoSigningKeysConfig } from './types.js';
/**
 * Durable OpenBao-backed keys provider that signs with Transit and verifies locally.
 *
 * @remarks
 * Private signing keys never enter this process. OpenBao holds the private material and
 * performs signatures; the signing keys document records which key is active and which
 * retired keys are still verifiable. An operator owns that document and the signing keys it
 * names.
 *
 * It hands a consumer a signer bound to the active key, resolves a public key by `kid` for
 * verification, and lists the public keys eligible for JWKS publication. Its token needs
 * only `read` on the document path and `update` on the signing path; see
 * `docs/en/howto/openbao/README.md` for how keys are provisioned and rotated.
 *
 * Operationally: every signature costs one OpenBao call, so an unreachable or sealed
 * OpenBao stops all issuance. Verification of already-signed credentials is served from the
 * in-process snapshot with no network call, so they survive an outage that blocks new
 * ones.
 * @group Keys
 * @category Key Providers
 */
export declare class OpenBaoKeysProvider implements IKeysProvider {
    private readonly config;
    private readonly algorithm;
    private readonly refreshCooldownSecs;
    /** Last validated signing key state, projected for verification and JWKS reads. */
    private snapshot;
    /** Single-flight wrapper over refreshSnapshot; concurrent callers share one document read. */
    private readonly synchronize;
    /** OpenBao origin read from `BAO_ADDR`. */
    private readonly baseUrl;
    /** Runtime OpenBao token read from `BAO_TOKEN`. */
    private readonly token;
    /**
     * @param config - Validated OpenBao key namespace and request policy configuration.
     * @param algorithm - JOSE algorithm enforced for all signing keys.
     * @param refreshCooldownSecs - Minimum time between two re-reads of the lifecycle
     *   document triggered by an unknown `kid`; it bounds how often a verification miss may
     *   synchronize the snapshot from OpenBao.
     * @throws {CustomError} ENV_VAR_ERROR when `BAO_ADDR` or `BAO_TOKEN` is missing, blank,
     *   or malformed.
     */
    constructor(config: OpenBaoSigningKeysConfig, algorithm: 'ES256', refreshCooldownSecs: number);
    /**
     * Loads the signing keys document and publishes the first snapshot.
     *
     * @group Keys
     * @category Key Providers
     * @returns Completed provider initialization.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when no signing keys document exists or it
     *   violates its invariants.
     * @throws {CustomError} EXTERNAL_API_ERROR when OpenBao is unreachable or answers
     *   unusably.
     */
    initialize(): Promise<void>;
    /**
     * Selects the active key and returns a signer bound to that key.
     *
     * @group Keys
     * @category Key Providers
     * @returns Provider-neutral signing capability.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when durable state has no usable active key.
     */
    getCurrentSigner(): Promise<SigningKeyHandle>;
    /**
     * Resolves one eligible public key by exact key identifier.
     *
     * @group Keys
     * @category Key Providers
     * @param kid - Key identifier carried with the signature.
     * @returns Public verification key, or null for an unknown or expired key.
     * @throws {CustomError} EXTERNAL_API_ERROR when a synchronize is due but OpenBao prevents
     *   it, so an outage is never reported as an unknown key.
     */
    getPublicKey(kid: string): Promise<CryptoKey | null>;
    /**
     * Synchronizes, then lists the keys currently eligible for JWKS publication.
     *
     * @group Keys
     * @category Key Providers
     * @returns Retained public JSON Web Keys.
     * @throws {CustomError} EXTERNAL_API_ERROR when OpenBao prevents the synchronize, so a
     *   stale snapshot is never served as though it had succeeded.
     */
    listPublicKeys(): Promise<readonly PublicJwk[]>;
    /**
     * Returns the published snapshot, synchronizing once if none has been built yet.
     *
     * @returns The most recently published projection of durable signing key state.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when a synchronize completed without
     *   publishing.
     */
    private currentSnapshot;
    /**
     * Reads the signing keys document and rebuilds the published snapshot; the work each
     * synchronize performs.
     *
     * @returns Completed synchronize with a freshly published snapshot.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when no signing keys document exists.
     */
    private refreshSnapshot;
    /**
     * Signs one exact JWS signing input with a captured signing key.
     *
     * @param providerKeyId - Signing key name captured when the signer was selected.
     * @param input - Exact JWS signing input bytes to sign.
     * @returns Raw 64-byte ES256 signature.
     * @throws {CustomError} EXTERNAL_API_ERROR when OpenBao signs with an unpublished version
     *   or returns a signature of the wrong length.
     */
    private signWithTransit;
    /**
     * Reads and validates the signing keys document, or reports its absence.
     *
     * @returns Validated state, or null when no document exists.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when the document exists but is not a signing
     *   keys document, or violates a signing key invariant.
     */
    private readSigningKeyState;
    /**
     * Projects validated state into the in-memory snapshot that serves verification and JWKS.
     *
     * @param state - Validated signing key state to project.
     * @returns Completed snapshot publication.
     * @throws {CustomError} KEYS_PROVIDER_ERROR when an entry holds a non-public JWK.
     */
    private publishSnapshot;
    /**
     * Parses a Transit sign response into the raw ES256 signature bytes.
     *
     * @param marshaledSignature - Raw `signature` string returned by Transit's sign endpoint.
     * @param providerKeyId - Transit key name, named in the error when the version is
     *   unexpected.
     * @returns Raw 64-byte ES256 signature.
     * @throws {CustomError} EXTERNAL_API_ERROR when Transit signed with an unpublished key
     *   version or returned a signature of the wrong length.
     */
    private parseTransitSignature;
    /**
     * Performs one OpenBao HTTP call and converts every failure into a classified
     * `CustomError`.
     *
     * @param operation - Short label naming the step, retained in the error cause.
     * @param path - Absolute OpenBao API path, including the `/v1` prefix.
     * @param init - Method and body for the request.
     * @param schema - Optional response schema; the body is validated when one is supplied.
     * @param schema.parse - Validator applied to the parsed response body.
     * @returns The validated response body, or the raw body when no schema is supplied.
     * @throws {CustomError} EXTERNAL_API_ERROR on any transport failure, timeout, or
     *   non-success status.
     */
    private request;
    /**
     * Classifies one non-success OpenBao status into an actionable error.
     *
     * @param operation - Short label naming the step.
     * @param path - Absolute OpenBao API path that failed.
     * @param status - HTTP status OpenBao returned.
     * @param raw - Parsed response body, consulted only for its sanitized error list.
     * @returns The classified error, for the caller to throw.
     */
    private failure;
    /**
     * Narrows an unknown error to the structured cause this class attaches to its failures.
     *
     * @param error - Error to inspect.
     * @returns The cause when the error came from this provider's transport, else undefined.
     */
    private failureCause;
}
//# sourceMappingURL=openbao-keys-provider.d.ts.map