import { Request, Response, CookieOptions } from 'express';
import type { AuthCookieOptions } from './context';

export interface TokenCookieOptions extends AuthCookieOptions {
  name?: string;
}

export interface AuthCookiesOptions {
  access?: TokenCookieOptions;
  refresh?: TokenCookieOptions;
}

function secureDefault(): boolean {
  return process.env.NODE_ENV === 'production';
}

function normaliseSameSite(value: AuthCookieOptions['sameSite']): CookieOptions['sameSite'] {
  if (typeof value === 'string') {
    return value.toLowerCase() as CookieOptions['sameSite'];
  }
  return value;
}

function cookieOptions(options: TokenCookieOptions = {}): CookieOptions {
  return {
    httpOnly: options.httpOnly !== false,
    secure: options.secure ?? secureDefault(),
    sameSite: normaliseSameSite(options.sameSite) ?? 'lax',
    maxAge: options.maxAge,
    path: options.path ?? '/',
    domain: options.domain,
  };
}

export function setAccessTokenCookie(
  res: Response,
  token: string,
  options: TokenCookieOptions = {},
): void {
  res.cookie(options.name || 'access_token', token, cookieOptions(options));
}

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  options: TokenCookieOptions = {},
): void {
  res.cookie(options.name || 'refresh_token', token, cookieOptions({
    httpOnly: true,
    ...options,
  }));
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken?: string; refreshToken?: string },
  options: AuthCookiesOptions = {},
): void {
  if (tokens.accessToken) {
    setAccessTokenCookie(res, tokens.accessToken, options.access);
  }
  if (tokens.refreshToken) {
    setRefreshTokenCookie(res, tokens.refreshToken, options.refresh);
  }
}

export function clearAuthCookies(
  res: Response,
  options: AuthCookiesOptions = {},
): void {
  res.clearCookie(options.access?.name || 'access_token', cookieOptions(options.access));
  res.clearCookie(options.refresh?.name || 'refresh_token', cookieOptions(options.refresh));
}

export function readTokenCookie(
  req: Request,
  name: string,
): string | undefined {
  return (req as any).cookies?.[name];
}
