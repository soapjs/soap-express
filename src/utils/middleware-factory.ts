import { MiddlewareMetadata } from '../types';
import { AuthenticationMiddleware, AuthorizationMiddleware } from '../middlewares/auth';
import { ValidationMiddleware } from '../middlewares/validation';
import { CorsMiddleware } from '../middlewares/cors';
import { RateLimitMiddleware } from '../middlewares/rate-limit';
import { LoggingMiddleware } from '../middlewares/logging';
import { CacheMiddleware } from '../middlewares/cache';

export class MiddlewareFactory {
  create(middleware: MiddlewareMetadata): any {
    switch (middleware.type) {
      case 'cors':
        return CorsMiddleware.create(middleware.options);
      
      case 'rateLimit':
        return RateLimitMiddleware.create(middleware.options);
      
      case 'authentication':
        return AuthenticationMiddleware.create(middleware.options);
      
      case 'authorization':
        return AuthorizationMiddleware.create(middleware.options);
      
      case 'validation':
        return ValidationMiddleware.create(middleware.options.schema);
      
      case 'logging':
        return LoggingMiddleware.create(middleware.options);
      
      case 'cache':
        return CacheMiddleware.create(middleware.options);
      
      case 'custom':
        return middleware.middleware;
      
      default:
        throw new Error(`Unknown middleware type: ${middleware.type}`);
    }
  }
}
