export interface BaseTokenConfig {
  secretOrKey: string;
  expiresIn: string | number;
  issuer?: string;
  audience?: string;
  algorithms?: string[];
  ignoreExpiration?: boolean;
  storageHandler?: TokenStorageHandler;
  retrievalHandler?: TokenRetrievalHandler;
  embedHandler?: TokenEmbedHandler;
}

/**
 * Specific configuration for access tokens, extending base token properties with storage and retrieval options.
 * @interface
 * @extends BaseTokenConfig
 */
export interface AccessTokenConfig extends BaseTokenConfig {}

/**
 * Specific configuration for refresh tokens, requiring more stringent settings due to longer validity.
 * @interface
 * @extends BaseTokenConfig
 */
export interface RefreshTokenConfig extends BaseTokenConfig {}

/**
 * A function type for token storage handlers, which allows the user to define how to store tokens.
 * @param token - The token to store.
 * @param data - The user data associated with the token.
 * @param [expiresIn] - Optional expiration time of the token.
 * @returns {Promise<void>} A promise that resolves when the token is successfully stored.
 */
export type TokenStorageHandler = (
  token: string,
  data: any,
  expiresIn?: number
) => Promise<void>;

/**
 * A function type for token retrieval handlers, which allows the user to define how to retrieve tokens.
 * @param userId - The user ID whose token is to be retrieved.
 * @returns {Promise<string | null>} A promise that resolves with the token, or null if no token is found.
 */
export type TokenRetrievalHandler = (userId: string) => Promise<string | null>;

/**
 * A function type for token return handlers, which allows the user to define how to include tokens in the response.
 * @param context - The context/response object to which the token should be added.
 * @param token - The token to return.
 */
export type TokenEmbedHandler = (context: any, token: string) => void;

export interface TokenHeaderOptions {
  headerName: string;
  scheme?: string;
  // extractor: (scheme: string) => string;
}

export interface TokenCookieOptions {
  cookieName: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
  // extractor: (cookieName: string) => string;
}
