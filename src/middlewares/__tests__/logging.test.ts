import { LoggingMiddleware } from '../logging';
import { Request, Response, NextFunction } from 'express';

// Mock console.log to avoid cluttering test output
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('LoggingMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      query: { page: '1' },
      body: { name: 'test' },
      headers: { 'user-agent': 'test-agent' }
    };
    mockRes = {
      statusCode: 200,
      end: jest.fn()
    };
    mockNext = jest.fn();
    
    // Clear console.log mock
    (console.log as jest.Mock).mockClear();
  });

  describe('create', () => {
    it('should create logging middleware', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should log request information', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/test - 127\.0\.0\.1/)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log response information when response ends', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end
      (mockRes as any).end('response data');

      expect(console.log).toHaveBeenCalledTimes(2); // Request + Response
      expect(console.log).toHaveBeenLastCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/test - 200 - \d+ms/)
      );
    });

    it('should call original res.end', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);
      const originalEnd = mockRes.end;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end
      (mockRes as any).end('response data');

      expect(originalEnd).toHaveBeenCalledWith('response data', undefined);
    });

    it('should handle response end with encoding', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);
      const originalEnd = mockRes.end;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end with encoding
      (mockRes as any).end('response data', 'utf8');

      expect(originalEnd).toHaveBeenCalledWith('response data', 'utf8');
    });

    it('should calculate duration correctly', (done) => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const startTime = Date.now();
      
      // Simulate response end after a short delay
      setTimeout(() => {
        (mockRes as any).end('response data');
        
        const loggedMessage = (console.log as jest.Mock).mock.calls[1][0];
        expect(loggedMessage).toContain('ms');
        
        done();
      }, 10);
    });
  });

  describe('createDetailed', () => {
    it('should create detailed logging middleware', () => {
      const middleware = LoggingMiddleware.createDetailed();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should log detailed request information', () => {
      const middleware = LoggingMiddleware.createDetailed();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] REQUEST:/),
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          query: { page: '1' },
          body: { name: 'test' },
          headers: { 'user-agent': 'test-agent' },
          ip: '127.0.0.1'
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log detailed response information', () => {
      const middleware = LoggingMiddleware.createDetailed();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end
      (mockRes as any).end('response data');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] RESPONSE:/),
        expect.objectContaining({
          statusCode: 200,
          duration: expect.stringMatching(/\d+ms/),
          responseSize: 13
        })
      );
    });

    it('should handle empty response body', () => {
      const middleware = LoggingMiddleware.createDetailed();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end without data
      (mockRes as any).end();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] RESPONSE:/),
        expect.objectContaining({
          statusCode: 200,
          duration: expect.stringMatching(/\d+ms/),
          responseSize: 0
        })
      );
    });

    it('should handle different status codes', () => {
      const middleware = LoggingMiddleware.createDetailed();
      mockRes.statusCode = 404;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end
      (mockRes as any).end('Not found');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] RESPONSE:/),
        expect.objectContaining({
          statusCode: 404,
          duration: expect.stringMatching(/\d+ms/),
          responseSize: 9
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing IP address', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);
      (mockReq as any).ip = undefined;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/test - undefined/)
      );
    });

    it('should handle missing query parameters', () => {
      const middleware = LoggingMiddleware.createDetailed();
      mockReq.query = undefined;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] REQUEST:/),
        expect.objectContaining({
          query: undefined
        })
      );
    });

    it('should handle missing body', () => {
      const middleware = LoggingMiddleware.createDetailed();
      mockReq.body = undefined;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] REQUEST:/),
        expect.objectContaining({
          body: undefined
        })
      );
    });

    it('should handle missing headers', () => {
      const middleware = LoggingMiddleware.createDetailed();
      mockReq.headers = undefined;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] REQUEST:/),
        expect.objectContaining({
          headers: undefined
        })
      );
    });
  });

  describe('performance', () => {
    it('should not significantly impact performance', () => {
      const options = { level: 'info' as const };
      const middleware = LoggingMiddleware.create(options);

      const startTime = Date.now();
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      (mockRes as any).end('response data');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 10ms for this simple operation)
      expect(duration).toBeLessThan(10);
    });
  });
});
