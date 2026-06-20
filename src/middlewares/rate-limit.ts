// Lazy-loaded — express-rate-limit is only require()'d when a route uses it.
import { Request } from 'express';
import { RateLimitOptions, SecurityThrottleOptions, ThrottleKeyBy, ThrottleRule } from '../types';

type ExpressMiddleware = (req: Request, res: any, next: any) => void;

const DEFAULT_THROTTLE_MESSAGE = 'Too many requests, please try again later.';

function keyGenerator(keyBy?: ThrottleKeyBy): ((req: Request) => string) | undefined {
  if (!keyBy || keyBy === 'ip') return undefined;
  if (typeof keyBy === 'function') return keyBy;
  if (keyBy === 'user') {
    return (req: Request) => {
      const user = (req as any).user;
      return user?.id !== undefined ? `user:${String(user.id)}` : req.ip;
    };
  }
  if (keyBy === 'apiKey') {
    return (req: Request) => {
      const header = req.get?.('x-api-key') || req.headers['x-api-key'];
      const value = Array.isArray(header) ? header[0] : header;
      return value ? `api-key:${value}` : req.ip;
    };
  }
  return undefined;
}

function normaliseRule(rule: ThrottleRule | boolean | undefined): ThrottleRule | undefined {
  if (!rule) return undefined;
  if (rule === true) {
    return { windowMs: 60_000, max: 300 };
  }
  return rule;
}

function createLimiter(rule: ThrottleRule): ExpressMiddleware {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs: rule.windowMs,
    max: rule.max,
    message: rule.message || DEFAULT_THROTTLE_MESSAGE,
    keyGenerator: keyGenerator(rule.keyBy),
    skip: rule.skip,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegex(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map(segment => {
      if (segment === '*') return '.*';
      if (segment.startsWith(':')) return '[^/]+';
      return escapeRegex(segment);
    })
    .join('/');
  return new RegExp(`^${source}$`);
}

function routeMatches(pattern: string, req: Request): boolean {
  const trimmed = pattern.trim();
  const firstSpace = trimmed.indexOf(' ');
  let method: string | undefined;
  let path = trimmed;

  if (firstSpace > 0) {
    method = trimmed.slice(0, firstSpace).toUpperCase();
    path = trimmed.slice(firstSpace + 1).trim();
  }

  if (method && method !== req.method.toUpperCase()) return false;
  return patternToRegex(path).test(req.path || req.url);
}

function groupMatches(pattern: string, req: Request): boolean {
  const path = req.path || req.url;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  }
  return patternToRegex(pattern).test(path);
}

export class RateLimitMiddleware {
  static create(options: RateLimitOptions) {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: options.message || 'Too many requests from this IP, please try again later.',
      keyGenerator: options.keyGenerator,
      skip: options.skip,
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  static createStrict() {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.'
    });
  }

  static createLoose() {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: 'Too many requests from this IP, please try again later.'
    });
  }

  static createDefault() {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.'
    });
  }

  static createThrottle(rule: ThrottleRule): ExpressMiddleware {
    return createLimiter(rule);
  }

  static createSecurityThrottle(options: SecurityThrottleOptions | ThrottleRule | boolean): ExpressMiddleware[] {
    const middlewares: ExpressMiddleware[] = [];
    const config = typeof options === 'boolean' || 'windowMs' in options
      ? { global: options }
      : options;

    const globalRule = normaliseRule(config.global);
    if (globalRule) {
      middlewares.push(createLimiter(globalRule));
    }

    Object.entries(config.groups || {}).forEach(([pattern, rule]) => {
      const limiter = createLimiter(rule);
      middlewares.push((req, res, next) => {
        if (!groupMatches(pattern, req)) return next();
        return limiter(req, res, next);
      });
    });

    Object.entries(config.routes || {}).forEach(([pattern, rule]) => {
      const limiter = createLimiter(rule);
      middlewares.push((req, res, next) => {
        if (!routeMatches(pattern, req)) return next();
        return limiter(req, res, next);
      });
    });

    return middlewares;
  }
}
