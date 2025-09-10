import cors from 'cors';
import { CorsOptions } from '../types';

export class CorsMiddleware {
  static create(options?: CorsOptions) {
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
    return cors({
      origin: '*',
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });
  }
}
