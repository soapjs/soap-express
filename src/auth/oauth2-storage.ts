import { randomBytes } from 'crypto';
import type {
  PersistenceConfig,
  PKCEConfig,
} from '@soapjs/soap-auth/types';
import type {
  OAuth2NonceConfig,
  OAuth2StateConfig,
} from '@soapjs/soap-auth/strategies/oauth2/oauth2.types';
import type { ExpressAuthContext, AuthCookieOptions } from './context';

export type OAuth2Persistence<T = any> = PersistenceConfig<T>;

export interface OAuth2ExpressStorageConfig {
  state: OAuth2StateConfig<ExpressAuthContext, string>;
  nonce: OAuth2NonceConfig<ExpressAuthContext, string>;
  pkce: PKCEConfig<ExpressAuthContext>;
}

export interface OAuth2CookieStorageOptions {
  stateCookie?: string;
  nonceCookie?: string;
  codeVerifierCookie?: string;
  codeChallengeCookie?: string;
  cookie?: AuthCookieOptions;
  maxAge?: number;
  pkceExpiresIn?: number;
}

function getContext(value: unknown): ExpressAuthContext {
  const context = value as ExpressAuthContext | undefined;
  if (!context) {
    throw new Error('OAuth2 Express auth context is not available');
  }
  return context;
}

export function runWithExpressAuthContext<T>(
  _context: ExpressAuthContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return fn();
}

function defaultCookieOptions(options: OAuth2CookieStorageOptions): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: options.cookie?.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options.cookie?.sameSite ?? 'lax',
    maxAge: options.cookie?.maxAge ?? options.maxAge ?? 5 * 60 * 1000,
    path: options.cookie?.path ?? '/',
    domain: options.cookie?.domain,
  };
}

function randomString(): string {
  return randomBytes(32).toString('base64url');
}

function cookiePersistence(cookieName: string, options: OAuth2CookieStorageOptions): OAuth2Persistence<string> {
  return {
    async store(data: string, context?: ExpressAuthContext): Promise<void> {
      getContext(context).setCookie(cookieName, data, defaultCookieOptions(options));
    },
    async read(context?: ExpressAuthContext): Promise<string | null> {
      return getContext(context).getCookie(cookieName) ?? null;
    },
    async remove(context?: ExpressAuthContext): Promise<void> {
      getContext(context).clearCookie(cookieName, defaultCookieOptions(options));
    },
  };
}

function expiringMemoryPersistence(): OAuth2Persistence<{ expiration: number }> {
  const values = new Map<string, { expiration: number }>();
  return {
    async store(key: string, ...args: any[]): Promise<void> {
      const metadata = args.find(arg => arg && typeof arg === 'object' && typeof arg.expiration === 'number') as
        | { expiration: number }
        | undefined;
      if (!metadata) return;
      values.set(key, metadata);
    },
    async read(...args: any[]): Promise<{ expiration: number } | null> {
      const key = args.find(arg => typeof arg === 'string') as string | undefined;
      if (!key) return null;
      const value = values.get(key);
      if (!value) return null;
      if (Date.now() > value.expiration) {
        values.delete(key);
        return null;
      }
      return value;
    },
    async remove(...args: any[]): Promise<void> {
      const key = args.find(arg => typeof arg === 'string') as string | undefined;
      if (!key) return;
      values.delete(key);
    },
  };
}

export function createCookieOAuth2Storage(
  options: OAuth2CookieStorageOptions = {},
): OAuth2ExpressStorageConfig {
  const stateCookie = options.stateCookie || 'oauth2_state';
  const nonceCookie = options.nonceCookie || 'oauth2_nonce';
  const codeVerifierCookie = options.codeVerifierCookie || 'oauth2_code_verifier';
  const codeChallengeCookie = options.codeChallengeCookie || 'oauth2_code_challenge';
  const pkceExpiresIn = options.pkceExpiresIn ?? 300;

  return {
    state: {
      generateState: randomString,
      persistence: cookiePersistence(stateCookie, options),
    },
    nonce: {
      generateNonce: randomString,
      persistence: cookiePersistence(nonceCookie, options),
    },
    pkce: {
      verifier: {
        expiresIn: pkceExpiresIn,
        generate: randomString,
        embed: (context, codeVerifier) => context.setCookie(codeVerifierCookie, codeVerifier, defaultCookieOptions(options)),
        extract: context => context.getCookie(codeVerifierCookie) ?? null,
        persistence: expiringMemoryPersistence(),
      },
      challenge: {
        expiresIn: pkceExpiresIn,
        embed: (context, challenge) => context.setCookie(codeChallengeCookie, challenge, defaultCookieOptions(options)),
        extract: context => context.getCookie(codeChallengeCookie) ?? null,
        persistence: expiringMemoryPersistence(),
      },
    },
  };
}
