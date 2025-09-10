import request from 'supertest';
import express from 'express';
import { CacheMiddleware } from '../src/middlewares/cache';

// Test controller for cache
class CacheTestController {
  private callCounts = {
    expensive: 0,
    short: 0,
    long: 0,
    noCache: 0
  };
  
  async getExpensiveData(req: any) {
    this.callCounts.expensive++;
    // Simulate expensive operation
    await new Promise(resolve => setTimeout(resolve, 10));
    return { 
      data: `Expensive data ${this.callCounts.expensive}`, 
      timestamp: Date.now(),
      callCount: this.callCounts.expensive 
    };
  }
  
  async getStaticData(req: any) {
    return { message: 'This should be cached forever', static: true };
  }
  
  async getShortCacheData(req: any) {
    this.callCounts.short++;
    return { 
      data: `Short cache data ${this.callCounts.short}`, 
      timestamp: Date.now(),
      callCount: this.callCounts.short
    };
  }
  
  async getLongCacheData(req: any) {
    this.callCounts.long++;
    return { 
      data: `Long cache data ${this.callCounts.long}`, 
      timestamp: Date.now(),
      callCount: this.callCounts.long
    };
  }
  
  async getNoCacheData(req: any) {
    this.callCounts.noCache++;
    return { 
      data: `No cache data ${this.callCounts.noCache}`, 
      timestamp: Date.now(),
      callCount: this.callCounts.noCache
    };
  }
}

describe('Cache Middleware Integration Tests', () => {
  let app: any;
  let server: any;
  let cacheTestController: CacheTestController;

  beforeAll(async () => {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use(express.urlencoded({ extended: true }));
    
    cacheTestController = new CacheTestController();

    // Test 1: Normal cache (5 minutes)
    expressApp.get('/api/cache/normal', 
      CacheMiddleware.create({ ttl: 5 * 60 * 1000 }), // 5 minutes
      async (req, res) => {
        const result = await cacheTestController.getExpensiveData(req);
        res.json(result);
      }
    );

    // Test 2: Very short cache (100ms) - absurdalnie krótki
    expressApp.get('/api/cache/short', 
      CacheMiddleware.create({ ttl: 100 }), // 100ms - absurdalnie krótki
      async (req, res) => {
        const result = await cacheTestController.getShortCacheData(req);
        res.json(result);
      }
    );

    // Test 3: Very long cache (1 hour) - absurdalnie długi
    expressApp.get('/api/cache/long', 
      CacheMiddleware.create({ ttl: 60 * 60 * 1000 }), // 1 hour - absurdalnie długi
      async (req, res) => {
        const result = await cacheTestController.getLongCacheData(req);
        res.json(result);
      }
    );

    // Test 4: Cache with custom key generator
    expressApp.get('/api/cache/custom/:id', 
      CacheMiddleware.create({ 
        ttl: 30 * 1000, // 30 seconds
        keyGenerator: (req) => `custom-${req.params.id}-${req.query.type || 'default'}`
      }),
      async (req, res) => {
        const result = await cacheTestController.getExpensiveData(req);
        res.json({ ...result, id: req.params.id, type: req.query.type });
      }
    );

    // Test 5: Cache with absurdalnie mały TTL (1ms)
    expressApp.get('/api/cache/absurd-short', 
      CacheMiddleware.create({ ttl: 1 }), // 1ms - absurdalnie krótki
      async (req, res) => {
        const result = await cacheTestController.getExpensiveData(req);
        res.json(result);
      }
    );

    // Test 6: Cache with absurdalnie duży TTL (24 hours)
    expressApp.get('/api/cache/absurd-long', 
      CacheMiddleware.create({ ttl: 24 * 60 * 60 * 1000 }), // 24 hours - absurdalnie długi
      async (req, res) => {
        const result = await cacheTestController.getStaticData(req);
        res.json(result);
      }
    );

    // Test 7: No cache (TTL = 0)
    expressApp.get('/api/cache/no-cache', 
      CacheMiddleware.create({ ttl: 0 }), // No cache
      async (req, res) => {
        const result = await cacheTestController.getNoCacheData(req);
        res.json(result);
      }
    );

    server = expressApp.listen(0);
    app = expressApp;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Normal Cache (5 minutes)', () => {
    it('should cache response for 5 minutes', async () => {
      const response1 = await request(app).get('/api/cache/normal');
      expect(response1.status).toBe(200);
      expect(response1.body.callCount).toBe(1);

      // Immediate second request should be cached
      const response2 = await request(app).get('/api/cache/normal');
      expect(response2.status).toBe(200);
      expect(response2.body.callCount).toBe(1); // Same call count = cached
      expect(response2.body.data).toBe(response1.body.data);
    });
  });

  describe('Very Short Cache (100ms)', () => {
    it('should cache for 100ms then expire', async () => {
      const response1 = await request(app).get('/api/cache/short');
      expect(response1.status).toBe(200);
      expect(response1.body.callCount).toBe(1);

      // Immediate request should be cached
      const response2 = await request(app).get('/api/cache/short');
      expect(response2.status).toBe(200);
      expect(response2.body.callCount).toBe(1); // Cached

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Request after expiry should not be cached
      const response3 = await request(app).get('/api/cache/short');
      expect(response3.status).toBe(200);
      expect(response3.body.callCount).toBe(2); // New call
    });
  });

  describe('Very Long Cache (1 hour)', () => {
    it('should cache for 1 hour', async () => {
      const response1 = await request(app).get('/api/cache/long');
      expect(response1.status).toBe(200);
      expect(response1.body.callCount).toBe(1);

      // Multiple requests should be cached
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/api/cache/long');
        expect(response.status).toBe(200);
        expect(response.body.callCount).toBe(1); // Always cached
        expect(response.body.data).toBe(response1.body.data);
      }
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom cache keys', async () => {
      // Different IDs should have different cache entries
      const response1 = await request(app).get('/api/cache/custom/123');
      expect(response1.status).toBe(200);
      expect(response1.body.id).toBe('123');
      const initialCallCount = response1.body.callCount;

      const response2 = await request(app).get('/api/cache/custom/456');
      expect(response2.status).toBe(200);
      expect(response2.body.id).toBe('456');

      // Same ID should be cached
      const response3 = await request(app).get('/api/cache/custom/123');
      expect(response3.status).toBe(200);
      expect(response3.body.callCount).toBe(initialCallCount); // Cached

      // Different query params should have different cache
      const response4 = await request(app).get('/api/cache/custom/123?type=special');
      expect(response4.status).toBe(200);
      expect(response4.body.type).toBe('special');
      expect(response4.body.callCount).toBeGreaterThan(initialCallCount); // New call due to different key
    });
  });

  describe('Absurdly Short Cache (1ms)', () => {
    it('should cache for 1ms then expire', async () => {
      const response1 = await request(app).get('/api/cache/absurd-short');
      expect(response1.status).toBe(200);
      const initialCallCount = response1.body.callCount;

      // Wait for cache to expire (1ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Request should not be cached
      const response2 = await request(app).get('/api/cache/absurd-short');
      expect(response2.status).toBe(200);
      expect(response2.body.callCount).toBeGreaterThan(initialCallCount); // New call
    });
  });

  describe('Absurdly Long Cache (24 hours)', () => {
    it('should cache for 24 hours', async () => {
      const response1 = await request(app).get('/api/cache/absurd-long');
      expect(response1.status).toBe(200);
      expect(response1.body.static).toBe(true);

      // Multiple requests should be cached
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/api/cache/absurd-long');
        expect(response.status).toBe(200);
        expect(response.body.message).toBe(response1.body.message);
        expect(response.body.timestamp).toBe(response1.body.timestamp); // Same timestamp = cached
      }
    });
  });

  describe('No Cache (TTL = 0)', () => {
    it('should not cache when TTL is 0', async () => {
      const response1 = await request(app).get('/api/cache/no-cache');
      expect(response1.status).toBe(200);
      expect(response1.body.callCount).toBe(1);

      // Immediate second request should not be cached
      const response2 = await request(app).get('/api/cache/no-cache');
      expect(response2.status).toBe(200);
      expect(response2.body.callCount).toBe(2); // New call
    });
  });

  describe('Cache Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const promises = [];
      
      // Make 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(request(app).get('/api/cache/normal'));
      }
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // All should have the same call count (cached)
      const callCounts = responses.map(r => r.body.callCount);
      const uniqueCallCounts = [...new Set(callCounts)];
      expect(uniqueCallCounts.length).toBe(1); // All same call count = cached
    });
  });
});
