// Lazy-loaded — express-rate-limit is only require()'d when a route uses it.
import { RateLimitOptions } from '../types';

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
}
