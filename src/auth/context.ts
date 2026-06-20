import { NextFunction, Request, Response } from 'express';
import type { CookieStorageOptions, StorageContext } from '@soapjs/soap-auth/types';

export interface AuthCookieOptions extends Partial<Omit<CookieStorageOptions, 'sameSite'>> {
  sameSite?: CookieStorageOptions['sameSite'] | 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  path?: string;
  domain?: string;
}

export type AuthStorageContext = StorageContext;

export interface ExpressAuthContext extends AuthStorageContext {
  req: Request;
  res: Response;
  next?: NextFunction;
  request: Request;
  response: Response;
  headers: Request['headers'];
  query: Request['query'];
  body: unknown;
  params: Request['params'];
  cookies: Record<string, string>;
  ip?: string;
  getHeader(name: string): string | undefined;
  getCookie(name: string): string | undefined;
  setCookie(name: string, value: string, options?: AuthCookieOptions): void;
  clearCookie(name: string, options?: AuthCookieOptions): void;
  redirect(url: string, status?: number): void;
  json(body: unknown, status?: number): void;
  status(code: number): ExpressAuthContext;
}

function normaliseHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function readCookieHeader(req: Request): Record<string, string> {
  const header = normaliseHeader(req.headers.cookie);
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((cookies, entry) => {
    const separator = entry.indexOf('=');
    if (separator === -1) return cookies;

    const name = entry.slice(0, separator).trim();
    const rawValue = entry.slice(separator + 1).trim();
    if (!name) return cookies;

    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }

    return cookies;
  }, {});
}

function getCookies(req: Request): Record<string, string> {
  const parsed = (req as any).cookies;
  if (parsed && typeof parsed === 'object') {
    return parsed;
  }
  return readCookieHeader(req);
}

function toExpressCookieOptions(options?: AuthCookieOptions): Record<string, unknown> {
  if (!options) return {};
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    maxAge: options.maxAge,
    path: options.path,
    domain: options.domain,
  };
}

export function createExpressAuthContext(
  req: Request,
  res: Response,
  next?: NextFunction,
): ExpressAuthContext {
  const context: ExpressAuthContext = {
    req,
    res,
    next,
    request: req,
    response: res,
    headers: req.headers,
    query: req.query,
    body: req.body,
    params: req.params,
    cookies: getCookies(req),
    ip: req.ip,

    getHeader(name: string): string | undefined {
      return normaliseHeader(req.headers[name.toLowerCase()]);
    },

    getCookie(name: string): string | undefined {
      return this.cookies?.[name];
    },

    setCookie(name: string, value: string, options?: AuthCookieOptions): void {
      if (typeof (res as any).cookie === 'function') {
        (res as any).cookie(name, value, toExpressCookieOptions(options));
        return;
      }
      res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(value)}`);
    },

    clearCookie(name: string, options?: AuthCookieOptions): void {
      if (typeof (res as any).clearCookie === 'function') {
        (res as any).clearCookie(name, toExpressCookieOptions(options));
        return;
      }
      res.setHeader('Set-Cookie', `${name}=; Max-Age=0`);
    },

    redirect(url: string, status: number = 302): void {
      res.redirect(status, url);
    },

    json(body: unknown, status?: number): void {
      if (status !== undefined) {
        res.status(status);
      }
      res.json(body);
    },

    status(code: number): ExpressAuthContext {
      res.status(code);
      return this;
    },

    storeInHeader(data: string, options): void {
      const headerName = options?.headerName || 'Authorization';
      const scheme = options?.scheme || 'Bearer';
      res.setHeader(headerName, scheme ? `${scheme} ${data}` : data);
    },

    storeInCookie(data: string, options): void {
      this.setCookie(options?.cookieName || 'token', data, options);
    },

    storeInSession(data: string, name: string = 'auth'): void {
      if ((req as any).session && typeof (req as any).session === 'object') {
        (req as any).session[name] = data;
      }
    },

    storeInBody(data: string, name: string = 'auth'): void {
      if (!req.body || typeof req.body !== 'object') {
        (req as any).body = {};
      }
      (req.body as Record<string, unknown>)[name] = data;
    },

    getFromHeader(options): string | null {
      const headerName = options?.headerName || 'Authorization';
      const header = this.getHeader(headerName);
      if (!header) return null;

      const scheme = options?.scheme || 'Bearer';
      if (!scheme) return header;

      const prefix = `${scheme} `;
      return header.startsWith(prefix) ? header.slice(prefix.length) : null;
    },

    getFromCookie(cookieName: string): string | undefined {
      return this.getCookie(cookieName);
    },

    getFromSession(name: string): string | undefined {
      return (req as any).session?.[name];
    },

    getFromBodyField(name: string): string | undefined {
      return typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, string | undefined>)[name]
        : undefined;
    },

    removeFromCookie(cookieName: string): void {
      this.clearCookie(cookieName);
    },

    removeFromSession(name: string): void {
      if ((req as any).session && typeof (req as any).session === 'object') {
        delete (req as any).session[name];
      }
    },
  };

  return context;
}
