import type { z } from 'zod';
import type { signingKeyProviderSchema } from './schema.js';
import type { signingKeysConfigSchema } from './schema.js';
/** Durable signing lifecycle and per-provider configuration. */
export type SigningKeysConfig = z.infer<typeof signingKeysConfigSchema>;
/** Signing-key provider selected at runtime by `SIGNING_KEY_PROVIDER`. */
export type SigningKeyProvider = z.infer<typeof signingKeyProviderSchema>;
//# sourceMappingURL=types.d.ts.map