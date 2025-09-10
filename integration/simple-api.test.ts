import request from 'supertest';
import express from 'express';

describe('Simple API Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Create a simple Express app for testing
    app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Simple test routes
    app.get('/api/test/hello', (req, res) => {
      res.json({ message: 'Hello from SoapJS Express!' });
    });
    
    app.post('/api/test/echo', (req, res) => {
      res.json({ 
        message: 'Echo response', 
        receivedData: req.body,
        timestamp: new Date().toISOString()
      });
    });
    
    app.get('/api/test/params/:id', (req, res) => {
      res.json({ 
        id: req.params.id,
        query: req.query,
        message: 'Got parameters'
      });
    });
    
    app.put('/api/test/update/:id', (req, res) => {
      res.json({ 
        id: req.params.id,
        data: req.body,
        message: 'Item updated',
        timestamp: new Date().toISOString()
      });
    });
    
    app.delete('/api/test/delete/:id', (req, res) => {
      res.json({ 
        id: req.params.id,
        message: 'Item deleted',
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

  describe('GET /api/test/hello', () => {
    it('should return hello message', async () => {
      const response = await request(app)
        .get('/api/test/hello')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Hello from SoapJS Express!'
      });
    });
  });

  describe('POST /api/test/echo', () => {
    it('should echo the request data', async () => {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        data: { nested: 'value' }
      };

      const response = await request(app)
        .post('/api/test/echo')
        .send(testData)
        .expect(200);

      expect(response.body.message).toBe('Echo response');
      expect(response.body.receivedData).toEqual(testData);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/api/test/echo')
        .send({})
        .expect(200);

      expect(response.body.message).toBe('Echo response');
      expect(response.body.receivedData).toEqual({});
    });
  });

  describe('GET /api/test/params/:id', () => {
    it('should handle path parameters', async () => {
      const response = await request(app)
        .get('/api/test/params/123')
        .expect(200);

      expect(response.body.id).toBe('123');
      expect(response.body.message).toBe('Got parameters');
      expect(response.body.query).toEqual({});
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/test/params/456?name=test&value=123')
        .expect(200);

      expect(response.body.id).toBe('456');
      expect(response.body.query).toEqual({
        name: 'test',
        value: '123'
      });
    });
  });

  describe('PUT /api/test/update/:id', () => {
    it('should update item with data', async () => {
      const updateData = {
        name: 'Updated Item',
        status: 'active',
        metadata: { version: 2 }
      };

      const response = await request(app)
        .put('/api/test/update/789')
        .send(updateData)
        .expect(200);

      expect(response.body.id).toBe('789');
      expect(response.body.data).toEqual(updateData);
      expect(response.body.message).toBe('Item updated');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('DELETE /api/test/delete/:id', () => {
    it('should delete item', async () => {
      const response = await request(app)
        .delete('/api/test/delete/999')
        .expect(200);

      expect(response.body.id).toBe('999');
      expect(response.body.message).toBe('Item deleted');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/test/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('Route GET /api/test/nonexistent not found');
    });

    it('should return 404 for non-existent controller', async () => {
      const response = await request(app)
        .get('/api/other/route')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('Request/Response flow', () => {
    it('should handle different HTTP methods', async () => {
      // Test all methods
      const methods = [
        { method: 'GET', path: '/api/test/hello' },
        { method: 'POST', path: '/api/test/echo', body: { test: 'data' } },
        { method: 'PUT', path: '/api/test/update/1', body: { update: 'data' } },
        { method: 'DELETE', path: '/api/test/delete/1' }
      ];

      for (const { method, path, body } of methods) {
        const response = await request(app)
          [method.toLowerCase()](path)
          .send(body || {})
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/test/echo')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.message).toBeDefined();
    });
  });
});
