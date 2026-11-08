import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { CompactEncrypt, compactDecrypt } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';

import { keyFilePayloadSchema } from './schema.js';
import type { KeyFilePayload } from './types.js';

const encoder: TextEncoder = new TextEncoder();
const decoder: TextDecoder = new TextDecoder();

/** JWE key-management and content-encryption algorithms used for the key file. */
const KEY_MANAGEMENT_ALG: string = 'PBES2-HS256+A128KW';
const CONTENT_ENCRYPTION_ALG: string = 'A256GCM';

/**
 * Reads and decrypts the encrypted key file, or reports its absence.
 *
 * @remarks
 * A decrypt or parse failure is reported, never swallowed: a wrong passphrase must fail
 * loudly rather than be mistaken for an absent file, so a typo cannot discard the keys.
 * @group Keys
 * @category Key Providers
 * @param filePath - Path to the encrypted key file.
 * @param secret - Passphrase that decrypts the compact JWE.
 * @returns Validated key-file payload, or null when no file exists.
 * @throws {CustomError} KEYS_PROVIDER_ERROR when the file exists but cannot be read,
 *   decrypted, or parsed into a valid key-file payload.
 */
export async function readKeyFile(
  filePath: string,
  secret: string
): Promise<KeyFilePayload | null> {
  let jwe: string;

  try {
    jwe = await readFile(filePath, 'utf8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw new CustomError({
      name: 'KEYS_PROVIDER_ERROR',
      message: `Signing-key file at '${filePath}' could not be read`,
      cause: error
    });
  }

  try {
    // `jose` requires PBES2 key management to be opted into on decrypt (an attacker-chosen
    // iteration count is a DoS vector), so allow exactly the algorithms this module writes and
    // reject anything else.
    const { plaintext } = await compactDecrypt(jwe, encoder.encode(secret), {
      keyManagementAlgorithms: [KEY_MANAGEMENT_ALG],
      contentEncryptionAlgorithms: [CONTENT_ENCRYPTION_ALG]
    });
    const payload: unknown = JSON.parse(decoder.decode(plaintext));

    return keyFilePayloadSchema.parse(payload);
  } catch (error: unknown) {
    throw new CustomError({
      name: 'KEYS_PROVIDER_ERROR',
      message:
        `Signing-key file at '${filePath}' could not be decrypted or is invalid; ` +
        `the passphrase may be wrong`,
      cause: error
    });
  }
}

/**
 * Encrypts and writes the key file, creating it only when none already exists.
 *
 * @remarks
 * The `wx` flag makes the create exclusive and `0o600` restricts it to the owner, so two
 * processes racing on one host resolve to one winner; the loser sees the file already
 * exists, is told so by the false return, and reads the winner's key instead of minting a
 * second.
 * @group Keys
 * @category Key Providers
 * @param filePath - Path to the encrypted key file.
 * @param secret - Passphrase that encrypts the compact JWE.
 * @param payload - Key-file payload to persist.
 * @returns True when this call created the file, false when one already existed.
 * @throws {CustomError} KEYS_PROVIDER_ERROR when encryption or the write fails for any
 *   reason other than the file already existing.
 */
export async function writeKeyFile(
  filePath: string,
  secret: string,
  payload: KeyFilePayload
): Promise<boolean> {
  try {
    const jwe: string = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
      .setProtectedHeader({ alg: KEY_MANAGEMENT_ALG, enc: CONTENT_ENCRYPTION_ALG })
      .encrypt(encoder.encode(secret));

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, jwe, { mode: 0o600, flag: 'wx' });

    return true;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return false;
    }

    throw new CustomError({
      name: 'KEYS_PROVIDER_ERROR',
      message: `Signing-key file at '${filePath}' could not be written`,
      cause: error
    });
  }
}
