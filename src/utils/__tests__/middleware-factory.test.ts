import { MiddlewareMetadata } from '@soapjs/soap';

import { MiddlewareFactory } from '../middleware-factory';

// Mock the middleware classes
jest.mock('../../middlewares/auth');
jest.mock('../../middlewares/validation', () => {
  const actual = jest.requireActual('../../middlewares/validation');
  return {
    ...actual,
    ValidationMiddleware: { create: jest.fn() },
  };
});
jest.mock('../../middlewares/cors');
jest.mock('../../middlewares/rate-limit');
jest.mock('../../middlewares/logging');
jest.mock('../../middlewares/cache');

import { AuthenticationMiddleware, AuthorizationMiddleware } from '../../middlewares/auth';
import { ValidationMiddleware } from '../../middlewares/validation';
import { CorsMiddleware } from '../../middlewares/cors';
import { RateLimitMiddleware } from '../../middlewares/rate-limit';
import { LoggingMiddleware } from '../../middlewares/logging';
import { CacheMiddleware } from '../../middlewares/cache';

describe('MiddlewareFactory', () => {
  let factory: MiddlewareFactory;

  beforeEach(() => {
    factory = new MiddlewareFactory();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create CORS middleware', () => {
      const mockMiddleware = jest.fn();
      (CorsMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'cors',
        options: { origin: 'http://localhost:3000' },
        order: 0
      };

      const result = factory.create(metadata);

      expect(CorsMiddleware.create).toHaveBeenCalledWith({ origin: 'http://localhost:3000' });
      expect(result).toBe(mockMiddleware);
    });

    it('should create rate limit middleware', () => {
      const mockMiddleware = jest.fn();
      (RateLimitMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'rateLimit',
        options: { windowMs: 60000, max: 100 },
        order: 0
      };

      const result = factory.create(metadata);

      expect(RateLimitMiddleware.create).toHaveBeenCalledWith({ windowMs: 60000, max: 100 });
      expect(result).toBe(mockMiddleware);
    });

    it('should create authentication middleware', () => {
      const mockMiddleware = jest.fn();
      (AuthenticationMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'authentication',
        options: { strategy: 'jwt' },
        order: 0
      };

      const result = factory.create(metadata);

      expect(AuthenticationMiddleware.create).toHaveBeenCalledWith({ strategy: 'jwt' });
      expect(result).toBe(mockMiddleware);
    });

    it('should create authorization middleware', () => {
      const mockMiddleware = jest.fn();
      (AuthorizationMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'authorization',
        options: { roles: ['admin'] },
        order: 0
      };

      const result = factory.create(metadata);

      expect(AuthorizationMiddleware.create).toHaveBeenCalledWith({ roles: ['admin'] });
      expect(result).toBe(mockMiddleware);
    });

    it('should create validation middleware', () => {
      const mockMiddleware = jest.fn();
      const mockSchema = {
        validate: jest.fn().mockReturnValue({ error: null, value: {} }),
      };
      (ValidationMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'validation',
        options: { schema: mockSchema },
        order: 0
      };

      const result = factory.create(metadata);

      expect(ValidationMiddleware.create).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toBe(mockMiddleware);
    });

    it('should create logging middleware', () => {
      const mockMiddleware = jest.fn();
      (LoggingMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'logging',
        options: { level: 'info' },
        order: 0
      };

      const result = factory.create(metadata);

      expect(LoggingMiddleware.create).toHaveBeenCalledWith({ level: 'info' });
      expect(result).toBe(mockMiddleware);
    });

    it('should create cache middleware', () => {
      const mockMiddleware = jest.fn();
      (CacheMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'cache',
        options: { ttl: 300 },
        order: 0
      };

      const result = factory.create(metadata);

      expect(CacheMiddleware.create).toHaveBeenCalledWith({ ttl: 300 });
      expect(result).toBe(mockMiddleware);
    });

    it('should return custom middleware', () => {
      const customMiddleware = jest.fn();

      const metadata: MiddlewareMetadata = {
        type: 'custom',
        options: {},
        middleware: customMiddleware,
        order: 0
      };

      const result = factory.create(metadata);

      expect(result).toBe(customMiddleware);
    });

    it('should throw error for unknown middleware type', () => {
      const metadata: MiddlewareMetadata = {
        type: 'unknown' as any,
        options: {},
        order: 0
      };

      expect(() => factory.create(metadata)).toThrow('Unknown middleware type: unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined options', () => {
      const mockMiddleware = jest.fn();
      (CorsMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'cors',
        options: undefined as any,
        order: 0
      };

      const result = factory.create(metadata);

      expect(CorsMiddleware.create).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockMiddleware);
    });

    it('should handle empty options', () => {
      const mockMiddleware = jest.fn();
      (CorsMiddleware.create as jest.Mock).mockReturnValue(mockMiddleware);

      const metadata: MiddlewareMetadata = {
        type: 'cors',
        options: {},
        order: 0
      };

      const result = factory.create(metadata);

      expect(CorsMiddleware.create).toHaveBeenCalledWith({});
      expect(result).toBe(mockMiddleware);
    });

    it('should handle custom middleware without middleware property', () => {
      const metadata: MiddlewareMetadata = {
        type: 'custom',
        options: {},
        order: 0
      };

      const result = factory.create(metadata);

      expect(result).toBeUndefined();
    });
  });
});
