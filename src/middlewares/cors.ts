// Lazy-loaded — cors is only require()'d when a route actually uses it.
import { CorsOptions } from '../types';

export class CorsMiddleware {
  static create(options?: CorsOptions) {
    const cors = require('cors');
    if (!options) {
      return this.createDefault();
    }
    return cors({
      origin: options.origin,
      credentials: options.credentials || false,
      methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: options.allowedHeaders || ['Content-Type', 'Authorization']
    });
  }

  static createDefault() {
    const cors = require('cors');
    return cors({
      origin: '*',
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });
  }
}
