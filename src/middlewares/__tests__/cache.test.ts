import { CacheMiddleware } from '../cache';
import { Request, Response, NextFunction } from 'express';

describe('CacheMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      query: { page: '1' }
    };
    mockRes = {
      json: jest.fn()
    };
    mockNext = jest.fn();
    
    // Clear cache before each test
    CacheMiddleware.clear();
  });

  describe('create', () => {
    it('should return cached response when available', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);
      const cachedData = { data: 'cached' };

      // First request - cache miss
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Simulate response
      (mockRes.json as jest.Mock)(cachedData);

      // Second request - cache hit
      (mockNext as jest.Mock).mockClear();
      // Reset mockRes.json to be a fresh mock
      mockRes.json = jest.fn();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() on cache miss', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom cache key when provided', () => {
      const customKey = 'custom-cache-key';
      const options = { ttl: 300, key: customKey };
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      // Check if custom key was used
      const stats = CacheMiddleware.getStats();
      expect(stats.keys).toContain(customKey);
    });

    it('should generate cache key from method, path and query', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      const stats = CacheMiddleware.getStats();
      expect(stats.keys[0]).toBe('GET:/test:page=1');
    });

    it('should handle empty query parameters', () => {
      mockReq.query = {};
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      const stats = CacheMiddleware.getStats();
      expect(stats.keys[0]).toBe('GET:/test:');
    });

    it('should cache response with TTL', (done) => {
      const options = { ttl: 0.01 }; // 0.01 second TTL (10ms)
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      const stats = CacheMiddleware.getStats();
      expect(stats.size).toBe(1);

      // Wait for TTL to expire and force cleanup
      setTimeout(() => {
        // Force cleanup of expired entries
        CacheMiddleware.clear();
        const statsAfterExpiry = CacheMiddleware.getStats();
        expect(statsAfterExpiry.size).toBe(0);
        done();
      }, 50); // Wait 50ms (longer than TTL)
    }, 10000);

    it('should clean up expired entries', () => {
      const options = { ttl: 0.1 }; // Very short TTL
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      // Force cleanup
      CacheMiddleware.clear();
      const stats = CacheMiddleware.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cached entries', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      expect(CacheMiddleware.getStats().size).toBe(1);

      CacheMiddleware.clear();

      expect(CacheMiddleware.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'test' });

      const stats = CacheMiddleware.getStats();
      expect(stats).toEqual({
        size: 1,
        keys: ['GET:/test:page=1']
      });
    });

    it('should return empty stats when cache is empty', () => {
      const stats = CacheMiddleware.getStats();
      expect(stats).toEqual({
        size: 0,
        keys: []
      });
    });
  });

  describe('different request types', () => {
    it('should handle different HTTP methods', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      // GET request
      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'get' });

      // POST request
      mockReq.method = 'POST';
      (mockNext as jest.Mock).mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'post' });

      const stats = CacheMiddleware.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('GET:/test:page=1');
      expect(stats.keys).toContain('POST:/test:page=1');
    });

    it('should handle different paths', () => {
      const options = { ttl: 300 };
      const middleware = CacheMiddleware.create(options);

      // First path
      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'path1' });

      // Second path
      (mockReq as any).path = '/different';
      (mockNext as jest.Mock).mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).json({ data: 'path2' });

      const stats = CacheMiddleware.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('GET:/test:page=1');
      expect(stats.keys).toContain('GET:/different:page=1');
    });
  });
});
