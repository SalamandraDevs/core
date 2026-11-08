import type { KeyFilePayload } from './types.js';
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
export declare function readKeyFile(filePath: string, secret: string): Promise<KeyFilePayload | null>;
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
export declare function writeKeyFile(filePath: string, secret: string, payload: KeyFilePayload): Promise<boolean>;
//# sourceMappingURL=jose-keyfile.d.ts.map