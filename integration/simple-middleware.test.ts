import request from 'supertest';
import express from 'express';
import cors from 'cors';

describe('Simple Middleware Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Create a simple Express app for testing
    app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:8080'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }));
    
    // Simple logging middleware
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
    
    // Simple rate limiting middleware (in-memory)
    const requestCounts = new Map<string, { count: number; resetTime: number }>();
    const RATE_LIMIT = 5; // 5 requests per minute
    const WINDOW_MS = 60000; // 1 minute
    
    app.use((req, res, next) => {
      const ip = req.get('X-Forwarded-For') || req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const windowStart = now - WINDOW_MS;
      
      // Clean old entries
      for (const [key, value] of requestCounts.entries()) {
        if (value.resetTime < windowStart) {
          requestCounts.delete(key);
        }
      }
      
      const current = requestCounts.get(ip);
      if (!current) {
        requestCounts.set(ip, { count: 1, resetTime: now });
        next();
      } else if (current.count >= RATE_LIMIT) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((current.resetTime + WINDOW_MS - now) / 1000)
        });
      } else {
        current.count++;
        next();
      }
    });
    
    // Test routes
    app.get('/api/middleware/test', (req, res) => {
      res.json({ 
        message: 'Middleware test successful',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    });
    
    app.post('/api/middleware/data', (req, res) => {
      res.json({ 
        message: 'Data received',
        body: req.body,
        contentType: req.get('content-type'),
        timestamp: new Date().toISOString()
      });
    });
    
    app.get('/api/middleware/rate-limit-test', (req, res) => {
      res.json({ 
        message: 'Rate limit test',
        timestamp: new Date().toISOString()
      });
    });
    
    // Error handling
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });
    
    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
      });
    });
    
    // Start server
    server = app.listen(0); // Use random port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('CORS Middleware', () => {
    it('should handle CORS preflight request', async () => {
      const response = await request(app)
        .options('/api/middleware/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/api/middleware/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from unauthorized origins', async () => {
      await request(app)
        .get('/api/middleware/test')
        .set('Origin', 'http://malicious-site.com')
        .expect(500);
    });
  });

  describe('Logging Middleware', () => {
    it('should log requests and responses', async () => {
      // Mock console.log to capture logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const response = await request(app)
        .get('/api/middleware/test')
        .expect(200);

      expect(response.body.message).toBe('Middleware test successful');
      
      // Verify that logging was called
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/middleware/test')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should allow requests within rate limit', async () => {
      // Make 3 requests (within the limit of 5) using different IPs
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/middleware/rate-limit-test')
          .set('X-Forwarded-For', `192.168.1.${i + 1}`)
          .expect(200);

        expect(response.body.message).toBe('Rate limit test');
      }
    });

    it('should block requests exceeding rate limit', async () => {
      // Make 6 requests from the same IP to exceed the limit (6 > 5)
      for (let i = 0; i < 6; i++) {
        const expectedStatus = i < 5 ? 200 : 429;
        await request(app)
          .get('/api/middleware/rate-limit-test')
          .set('X-Forwarded-For', '192.168.1.100')
          .expect(expectedStatus);
      }
    }, 10000); // Increase timeout for rate limit test
  });

  describe('Middleware Order', () => {
    it('should process middlewares in correct order', async () => {
      const response = await request(app)
        .post('/api/middleware/data')
        .set('Origin', 'http://localhost:3000')
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', '192.168.1.200')
        .send({ test: 'data' })
        .expect(200);

      // Should have CORS headers
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      
      // Should have processed the request
      expect(response.body.message).toBe('Data received');
      expect(response.body.body).toEqual({ test: 'data' });
    });
  });

  describe('Error Handling in Middleware', () => {
    it('should handle middleware errors gracefully', async () => {
      // Test with invalid JSON to trigger parsing error
      const response = await request(app)
        .post('/api/middleware/data')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
    });
  });
});
