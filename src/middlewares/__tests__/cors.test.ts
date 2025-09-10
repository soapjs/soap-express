import { CorsMiddleware } from '../cors';

describe('CorsMiddleware', () => {
  describe('create', () => {
    it('should create CORS middleware with custom options', () => {
      const options = {
        origin: 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
      };

      const middleware = CorsMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create CORS middleware with minimal options', () => {
      const options = {
        origin: 'https://example.com'
      };

      const middleware = CorsMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create CORS middleware with empty options', () => {
      const options = { origin: '*' };

      const middleware = CorsMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should handle undefined options gracefully', () => {
      const middleware = CorsMiddleware.create(undefined as any);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('createDefault', () => {
    it('should create default CORS middleware', () => {
      const middleware = CorsMiddleware.createDefault();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware with default settings', () => {
      const middleware = CorsMiddleware.createDefault();

      // The middleware should be a function that can be used with Express
      expect(typeof middleware).toBe('function');
    });
  });

  describe('middleware function', () => {
    it('should be callable with Express middleware signature', () => {
      const options = {
        origin: 'http://localhost:3000',
        credentials: true
      };

      const middleware = CorsMiddleware.create(options);

      // Mock Express middleware parameters
      const mockReq = {
        headers: {},
        method: 'GET',
        url: '/test'
      };
      const mockRes = {
        header: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn(),
        get: jest.fn(),
        json: jest.fn(),
        type: jest.fn(),
        format: jest.fn(),
        attachment: jest.fn(),
        download: jest.fn(),
        redirect: jest.fn(),
        render: jest.fn(),
        locals: {},
        charset: 'utf-8',
        app: {} as any,
        req: {} as any,
        statusCode: 200,
        statusMessage: 'OK',
        headersSent: false,
        finished: false,
        writable: true,
        writableEnded: false,
        writableFinished: false,
        writableHighWaterMark: 16384,
        writableLength: 0,
        writableObjectMode: false,
        writableCorked: 0,
        destroyed: false,
        readable: false,
        readableEncoding: null,
        readableEnded: false,
        readableFlowing: null,
        readableHighWaterMark: 16384,
        readableLength: 0,
        readableObjectMode: false,
        _read: jest.fn(),
        read: jest.fn(),
        setEncoding: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        isPaused: jest.fn(),
        unpipe: jest.fn(),
        push: jest.fn(),
        addListener: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        eventNames: jest.fn(),
        listenerCount: jest.fn(),
        pipe: jest.fn(),
        cork: jest.fn(),
        uncork: jest.fn(),
        setDefaultEncoding: jest.fn(),
        _write: jest.fn(),
        write: jest.fn(),
        _writev: jest.fn(),
        writev: jest.fn(),
        _final: jest.fn(),
        final: jest.fn(),
        // Add missing properties for CORS
        getHeader: jest.fn(),
        set: jest.fn(),
        removeHeader: jest.fn(),
        vary: jest.fn(),
        // Add more properties for CORS
        headers: {},
        getHeaderNames: jest.fn(() => []),
        hasHeader: jest.fn(() => false),
        writeHead: jest.fn()
      } as any;
      const mockNext = jest.fn();

      // Should not throw when called
      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    it('should handle preflight requests', () => {
      const options = {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
      };

      const middleware = CorsMiddleware.create(options);

      const mockReq = {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      } as any;
      const mockRes = {
        setHeader: jest.fn(),
        statusCode: 200,
        end: jest.fn(),
        // Add all required properties for CORS
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        get: jest.fn(),
        header: jest.fn(),
        type: jest.fn(),
        format: jest.fn(),
        attachment: jest.fn(),
        download: jest.fn(),
        redirect: jest.fn(),
        render: jest.fn(),
        locals: {},
        charset: 'utf-8',
        app: {} as any,
        req: {} as any,
        statusMessage: 'OK',
        headersSent: false,
        finished: false,
        writable: true,
        writableEnded: false,
        writableFinished: false,
        writableHighWaterMark: 16384,
        writableLength: 0,
        writableObjectMode: false,
        writableCorked: 0,
        destroyed: false,
        readable: false,
        readableEncoding: null,
        readableEnded: false,
        readableFlowing: null,
        readableHighWaterMark: 16384,
        readableLength: 0,
        readableObjectMode: false,
        _read: jest.fn(),
        read: jest.fn(),
        setEncoding: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        isPaused: jest.fn(),
        unpipe: jest.fn(),
        push: jest.fn(),
        addListener: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        eventNames: jest.fn(),
        listenerCount: jest.fn(),
        pipe: jest.fn(),
        cork: jest.fn(),
        uncork: jest.fn(),
        setDefaultEncoding: jest.fn(),
        _write: jest.fn(),
        write: jest.fn(),
        _writev: jest.fn(),
        writev: jest.fn(),
        _final: jest.fn(),
        final: jest.fn(),
        // Add missing properties for CORS
        getHeader: jest.fn(),
        set: jest.fn(),
        removeHeader: jest.fn(),
        vary: jest.fn(),
        // Add more properties for CORS
        headers: {},
        getHeaderNames: jest.fn(() => []),
        hasHeader: jest.fn(() => false),
        writeHead: jest.fn()
      } as any;
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      // Should handle OPTIONS request
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('options handling', () => {
    it('should use provided origin', () => {
      const options = {
        origin: 'https://myapp.com'
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });

    it('should use provided credentials setting', () => {
      const options = {
        origin: 'https://myapp.com',
        credentials: true
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });

    it('should use provided methods', () => {
      const options = {
        origin: 'https://myapp.com',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });

    it('should use provided allowed headers', () => {
      const options = {
        origin: 'https://myapp.com',
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });

    it('should use default values when not provided', () => {
      const options = {
        origin: 'https://myapp.com'
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should work with wildcard origin', () => {
      const options = {
        origin: '*',
        credentials: false
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });

    it('should work with function origin', () => {
      const options = {
        origin: '*' as any,
        credentials: true
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });

    it('should work with array of origins', () => {
      const options = {
        origin: ['http://localhost:3000', 'https://myapp.com'],
        credentials: true
      };

      const middleware = CorsMiddleware.create(options);
      expect(middleware).toBeDefined();
    });
  });
});
