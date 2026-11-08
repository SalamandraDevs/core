import { Buffer } from 'node:buffer';

import { importJWK } from 'jose';
import { CustomError, singleFlight } from '@salamandradevs/tools/shared';
import { loadEnvVariables } from '@salamandradevs/tools/node';
import type { CryptoKey } from 'jose';

import { openBaoSigningKeysConfigSchema } from './schema.js';
import { openBaoErrorResponseSchema } from './schema.js';
import { openBaoKvReadResponseSchema } from './schema.js';
import { openBaoTransitSignResponseSchema } from './schema.js';
import { validateSigningKeyState } from '../validation.js';
import type { IKeysProvider } from '../contracts.js';
import type { PublicJwk, SigningKeyHandle } from '../types.js';
import type { SigningKeyEntry, SigningKeyState } from '../types.js';
import type { CachedKey } from './types.js';
import type { OpenBaoFailureCause } from './types.js';
import type { OpenBaoKvReadResponse } from './types.js';
import type { OpenBaoSigningKeysConfig } from './types.js';
import type { OpenBaoTransitSignResponse } from './types.js';
import type { SigningKeySnapshot } from './types.js';

/** Number of ES256 signature bytes, as the concatenated `r||s` pair JWT requires. */
const ES256_SIGNATURE_BYTES: number = 64;

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
export class OpenBaoKeysProvider implements IKeysProvider {
  /** Last validated signing key state, projected for verification and JWKS reads. */
  private snapshot: SigningKeySnapshot | null = null;

  /** Single-flight wrapper over refreshSnapshot; concurrent callers share one document read. */
  private readonly synchronize = singleFlight(() => this.refreshSnapshot());

  /** OpenBao origin read from `BAO_ADDR`. */
  private readonly baseUrl: string;

  /** Runtime OpenBao token read from `BAO_TOKEN`. */
  private readonly token: string;

  /**
   * @param config - Validated OpenBao key namespace and request policy configuration.
   * @param algorithm - JOSE algorithm enforced for all signing keys.
   * @param refreshCooldownSecs - Minimum time between two re-reads of the lifecycle
   *   document triggered by an unknown `kid`; it bounds how often a verification miss may
   *   synchronize the snapshot from OpenBao.
   * @throws {CustomError} ENV_VAR_ERROR when `BAO_ADDR` or `BAO_TOKEN` is missing, blank,
   *   or malformed.
   */
  constructor(
    private readonly config: OpenBaoSigningKeysConfig,
    private readonly algorithm: 'ES256',
    private readonly refreshCooldownSecs: number
  ) {
    // loadEnvVariables reads and validates connection variables from
    // the config schema's `meta.env` fields name.
    const { baoAddr, baoToken } = loadEnvVariables(openBaoSigningKeysConfigSchema);

    this.baseUrl = baoAddr;
    this.token = baoToken;
  }

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
  async initialize(): Promise<void> {
    // Bootstrap depends on this method by name through the ISigningKeyProvider contract. It runs
    // the first synchronize, which loads the signing keys document and publishes the snapshot;
    // an absent document is a provisioning failure, not a first run.
    await this.synchronize();
  }

  /**
   * Selects the active key and returns a signer bound to that key.
   *
   * @group Keys
   * @category Key Providers
   * @returns Provider-neutral signing capability.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when durable state has no usable active key.
   */
  async getCurrentSigner(): Promise<SigningKeyHandle> {
    // Runs once per access token issued. The synchronize lets a replica pick up a key the
    // operator promoted without waiting for a restart.
    await this.synchronize();

    const snapshot: SigningKeySnapshot = await this.currentSnapshot();
    const activeKey: SigningKeyEntry | undefined = snapshot.state.keys.find(
      (entry: SigningKeyEntry) => entry.status === 'active'
    );

    if (!activeKey) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'No active signing key is available'
      });
    }

    // Bind the handle to this one `activeKey`: the `kid` returned and the `providerKeyId` the
    // sign closure captures come from the same entry, so they are a matched pair. A later
    // synchronize may promote a different key, but this handle still signs with the key named by
    // the `kid` the caller stamps into the JWT header, so the two can never disagree.

    return {
      kid: activeKey.kid,
      algorithm: this.algorithm,
      sign: async (input: Uint8Array): Promise<Uint8Array> =>
        this.signWithTransit(activeKey.providerKeyId, input)
    };
  }

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
  async getPublicKey(kid: string): Promise<CryptoKey | null> {
    // Runs once per bearer token verified, and normally answered entirely from the in-process
    // snapshot. That is why verification survives an OpenBao outage while issuance does not.
    let snapshot: SigningKeySnapshot = await this.currentSnapshot();
    let cachedKey: CachedKey | undefined = snapshot.byKid.get(kid);

    // An unknown `kid` usually means the operator rotated and this replica has not caught up, so
    // synchronizing (re-reading the signing keys document) could pick up the new key. The
    // synchronize runs only once the snapshot is older than its cache age; while the snapshot is
    // still fresh, a miss returns null without calling OpenBao. That caps synchronizes at one
    // per cache-age window, so a flood of unknown `kid`s (forged or stale) cannot turn into one
    // OpenBao request per request.
    if (!cachedKey && Date.now() - snapshot.loadedAt >= this.refreshCooldownSecs * 1000) {
      await this.synchronize();
      snapshot = await this.currentSnapshot();
      cachedKey = snapshot.byKid.get(kid);
    }

    if (!cachedKey) {
      return null;
    }

    // Only retired entries carry `verifyUntil`. Refuse an expired one even when the operator
    // has not yet removed it, so the overlap window is honoured to the second.
    if (cachedKey.verifyUntil && Date.parse(cachedKey.verifyUntil) <= Date.now()) {
      return null;
    }

    return cachedKey.key;
  }

  /**
   * Synchronizes, then lists the keys currently eligible for JWKS publication.
   *
   * @group Keys
   * @category Key Providers
   * @returns Retained public JSON Web Keys.
   * @throws {CustomError} EXTERNAL_API_ERROR when OpenBao prevents the synchronize, so a
   *   stale snapshot is never served as though it had succeeded.
   */
  async listPublicKeys(): Promise<readonly PublicJwk[]> {
    // Backs `GET /.well-known/jwks.json`. Synchronizing here is what lets every replica publish
    // a key the operator added, which is a precondition for that key ever being promoted safely.
    await this.synchronize();

    const snapshot: SigningKeySnapshot = await this.currentSnapshot();

    return snapshot.keys;
  }

  /**
   * Returns the published snapshot, synchronizing once if none has been built yet.
   *
   * @returns The most recently published projection of durable signing key state.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when a synchronize completed without
   *   publishing.
   */
  private async currentSnapshot(): Promise<SigningKeySnapshot> {
    if (!this.snapshot) {
      await this.synchronize();
    }

    // Reaching here without a snapshot would mean a synchronize returned without publishing,
    // which no path does. Failing loudly beats handing callers an empty key set.
    if (!this.snapshot) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Signing-key snapshot is unavailable'
      });
    }

    return this.snapshot;
  }

  /**
   * Reads the signing keys document and rebuilds the published snapshot; the work each
   * synchronize performs.
   *
   * @returns Completed synchronize with a freshly published snapshot.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when no signing keys document exists.
   */
  private async refreshSnapshot(): Promise<void> {
    const state: SigningKeyState | null = await this.readSigningKeyState();

    // The operator provisions the first key and this document. Creating one here would mint a
    // signing key nobody asked for and invalidate every token already in circulation.
    if (!state) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message:
          `No lifecycle document at '${this.config.kvMount}/${this.config.statePath}'. ` +
          `Provision the first signing key and its document before starting the service; ` +
          `see docs/en/howto/openbao/README.md`
      });
    }

    await this.publishSnapshot(state);
  }

  /**
   * Signs one exact JWS signing input with a captured signing key.
   *
   * @param providerKeyId - Signing key name captured when the signer was selected.
   * @param input - Exact JWS signing input bytes to sign.
   * @returns Raw 64-byte ES256 signature.
   * @throws {CustomError} EXTERNAL_API_ERROR when OpenBao signs with an unpublished version
   *   or returns a signature of the wrong length.
   */
  private async signWithTransit(
    providerKeyId: string,
    input: Uint8Array
  ): Promise<Uint8Array> {
    const response: OpenBaoTransitSignResponse = await this.request(
      'sign',
      `/v1/${this.config.transitMount}/sign/${providerKeyId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          // `prehashed: false` leaves the SHA-256 to OpenBao, so this process never handles even
          // a digest. `marshaling_algorithm: 'jws'` asks for the concatenated `r||s` form JWT
          // requires, URL-safe base64 encoded, instead of the ASN.1 form OpenSSL uses.
          input: Buffer.from(input).toString('base64'),
          hash_algorithm: 'sha2-256',
          prehashed: false,
          marshaling_algorithm: 'jws'
        })
      },
      openBaoTransitSignResponseSchema
    );

    return this.parseTransitSignature(response.data.signature, providerKeyId);
  }

  /**
   * Reads and validates the signing keys document, or reports its absence.
   *
   * @returns Validated state, or null when no document exists.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when the document exists but is not a signing
   *   keys document, or violates a signing key invariant.
   */
  private async readSigningKeyState(): Promise<SigningKeyState | null> {
    try {
      const response: OpenBaoKvReadResponse = await this.request(
        'read-state',
        `/v1/${this.config.kvMount}/data/${this.config.statePath}`,
        { method: 'GET' },
        openBaoKvReadResponseSchema
      );
      const state: unknown = response.data.data.state;

      // The document exists but holds something else, so something other than this service owns
      // that KV path. Say what was found rather than reporting a generic validation failure.
      if (!state || typeof state !== 'object') {
        const present: string = Object.keys(response.data.data).join(', ') || 'none';

        throw new CustomError({
          name: 'KEYS_PROVIDER_ERROR',
          message:
            `KV document '${this.config.kvMount}/${this.config.statePath}' (version ` +
            `${String(response.data.metadata.version)}) holds no 'state' key; present keys: ` +
            `${present}. See docs/en/howto/openbao/README.md`
        });
      }

      let validated: SigningKeyState;

      try {
        validated = validateSigningKeyState(state, this.algorithm);
      } catch (error: unknown) {
        // Keep a classified failure as-is; only a raw parse error needs wrapping.
        if (error instanceof CustomError) {
          throw error;
        }

        throw new CustomError({
          name: 'KEYS_PROVIDER_ERROR',
          message: 'OpenBao lifecycle state is invalid',
          cause: error
        });
      }

      return validated;
    } catch (error: unknown) {
      // Absence is reported to the caller, which turns it into a provisioning error. Note this
      // is 404 only for a path the policy permits; a path outside the policy answers 403 and
      // correctly propagates as a transport failure.
      if (this.failureCause(error)?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Projects validated state into the in-memory snapshot that serves verification and JWKS.
   *
   * @param state - Validated signing key state to project.
   * @returns Completed snapshot publication.
   * @throws {CustomError} KEYS_PROVIDER_ERROR when an entry holds a non-public JWK.
   */
  private async publishSnapshot(state: SigningKeyState): Promise<void> {
    const keys: PublicJwk[] = [];
    const byKid: Map<string, CachedKey> = new Map<string, CachedKey>();

    // Build into locals, not into `this.snapshot`. A failed import part-way through then leaves
    // the previous snapshot serving traffic instead of exposing a half-built key set to
    // concurrent verification calls.
    for (const entry of state.keys) {
      // Past its verification deadline: drop it from JWKS now, even though the operator has not
      // yet removed the entry.
      if (entry.verifyUntil && Date.parse(entry.verifyUntil) <= Date.now()) {
        continue;
      }

      const imported: CryptoKey | Uint8Array = await importJWK(
        entry.publicJwk,
        this.algorithm
      );

      // `importJWK` returns bytes for symmetric keys. Reaching that here would mean secret
      // material sat in a document that is published to the world.
      if (imported instanceof Uint8Array) {
        throw new CustomError({
          name: 'KEYS_PROVIDER_ERROR',
          message: 'OpenBao lifecycle state contains a non-public JWK'
        });
      }

      keys.push(entry.publicJwk);
      byKid.set(entry.kid, {
        key: imported,
        status: entry.status,
        verifyUntil: entry.verifyUntil
      });
    }

    // Single assignment, so readers move from one complete snapshot to the next.
    this.snapshot = { loadedAt: Date.now(), state, keys, byKid };
  }

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
  private parseTransitSignature(
    marshaledSignature: string,
    providerKeyId: string
  ): Uint8Array {
    // Transit returns the signature as `vault:v<version>:<base64url r||s>`. Parse that shape to
    // separate the two parts: group 1 is the key version that produced the signature, group 2
    // is the marshaled signature payload. The version is checked next; group 2 is decoded below.
    //
    // Only version 1 is expected: the provisioning procedure creates one key per rotation and
    // never rotates versions inside a key, so only version 1 has a public half in JWKS. Any
    // other version means someone rotated the key in place, and the resulting token would be
    // unverifiable.
    const marshaled: RegExpExecArray | null = /^vault:v(\d+):(.+)$/.exec(
      marshaledSignature
    );

    if (!marshaled || marshaled[1] !== '1') {
      throw new CustomError({
        name: 'EXTERNAL_API_ERROR',
        message: `OpenBao signed with an unpublished key version for '${providerKeyId}'`
      });
    }

    const signature: Uint8Array = Buffer.from(marshaled[2], 'base64url');

    // A correct ES256 signature is exactly two 32-byte integers. A different length means the
    // marshaling was not what was asked for, and jose would reject the token later anyway.
    if (signature.byteLength !== ES256_SIGNATURE_BYTES) {
      throw new CustomError({
        name: 'EXTERNAL_API_ERROR',
        message: 'OpenBao returned an invalid ES256 signature'
      });
    }

    return signature;
  }

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
  private async request<T>(
    operation: string,
    path: string,
    init: RequestInit,
    schema?: { parse: (value: unknown) => T }
  ): Promise<T> {
    // The single place OpenBao transport lives; only two call sites reach it, a state read and
    // a signature.
    const controller: AbortController = new AbortController();
    const timeout: NodeJS.Timeout = setTimeout(() => {
      controller.abort();
    }, this.config.requestTimeoutMs);

    try {
      const response: Response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-vault-token': this.token
        }
      });

      // A failure body may not be JSON at all; that must not throw before the status has been
      // classified below.
      const raw: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw this.failure(operation, path, response.status, raw);
      }

      // Validate against the schema when one is supplied; OpenBao shapes differ between
      // endpoints in ways easy to assume wrongly. A schemaless call returns the raw body as `T`.
      return schema ? schema.parse(raw) : (raw as T);
    } catch (error: unknown) {
      // Already classified by `failure`; keep its status.
      if (error instanceof CustomError) {
        throw error;
      }

      // The request never completed: a timeout, DNS failure, refused connection, or a schema
      // rejection. There is no status to classify, so the cause carries the original error.
      throw new CustomError({
        name: 'EXTERNAL_API_ERROR',
        message: `OpenBao ${operation} request to ${path} failed`,
        cause: { operation, path, error }
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Classifies one non-success OpenBao status into an actionable error.
   *
   * @param operation - Short label naming the step.
   * @param path - Absolute OpenBao API path that failed.
   * @param status - HTTP status OpenBao returned.
   * @param raw - Parsed response body, consulted only for its sanitized error list.
   * @returns The classified error, for the caller to throw.
   */
  private failure(
    operation: string,
    path: string,
    status: number,
    raw: unknown
  ): CustomError {
    const parsed: ReturnType<typeof openBaoErrorResponseSchema.safeParse> =
      openBaoErrorResponseSchema.safeParse(raw);
    const errors: readonly string[] = parsed.success ? parsed.data.errors : [];

    let detail: string = `status ${String(status)}`;

    if (status === 503) {
      // 503 covers both a sealed instance and a node that is not active. The remedies differ,
      // so consult the message rather than reporting one for the other.
      detail = errors.some((message) => message.toLowerCase().includes('sealed'))
        ? 'the instance is sealed; unseal it to restore signing'
        : 'the instance is sealed or has no active node';
    } else if (status === 403) {
      // 403 is returned for an expired or revoked token and for a policy missing a capability
      // alike. The service needs `read` on the state path and `update` on `transit/sign/*`.
      detail =
        'the token was rejected; it has expired, been revoked, or its policy lacks a capability on this path';
    } else if (status === 429) {
      detail = 'the request was rate limited by a quota';
    }

    // The response body can name mounts, policies and paths, so only the status category and
    // the path this service already knows are allowed into the message.
    return new CustomError({
      name: 'EXTERNAL_API_ERROR',
      message: `OpenBao ${operation} request to ${path} failed: ${detail}`,
      cause: { operation, path, status }
    });
  }

  /**
   * Narrows an unknown error to the structured cause this class attaches to its failures.
   *
   * @param error - Error to inspect.
   * @returns The cause when the error came from this provider's transport, else undefined.
   */
  private failureCause(error: unknown): OpenBaoFailureCause | undefined {
    if (
      !(error instanceof CustomError) ||
      typeof error.cause !== 'object' ||
      error.cause === null
    ) {
      return undefined;
    }

    return error.cause as OpenBaoFailureCause;
  }
}
