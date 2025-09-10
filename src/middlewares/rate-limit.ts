import rateLimit from 'express-rate-limit';
import { RateLimitOptions } from '../types';

export class RateLimitMiddleware {
  static create(options: RateLimitOptions) {
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
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
  }

  static createLoose() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
  }

  static createDefault() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
  }
}
