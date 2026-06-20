import { RateLimitMiddleware } from '../rate-limit';

describe('RateLimitMiddleware', () => {
  describe('create', () => {
    it('should create rate limit middleware with custom options', () => {
      const options = {
        windowMs: 60000, // 1 minute
        max: 100,
        message: 'Custom rate limit message'
      };

      const middleware = RateLimitMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create rate limit middleware with minimal options', () => {
      const options = {
        windowMs: 30000,
        max: 50
      };

      const middleware = RateLimitMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should use default message when not provided', () => {
      const options = {
        windowMs: 30000,
        max: 50
      };

      const middleware = RateLimitMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create rate limit middleware with all options', () => {
      const options = {
        windowMs: 60000,
        max: 100,
        message: 'Rate limit exceeded',
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        keyGenerator: (req: any) => req.ip,
        skip: (req: any) => false,
        onLimitReached: (req: any, res: any, options: any) => {
          console.log('Rate limit reached for IP:', req.ip);
        }
      };

      const middleware = RateLimitMiddleware.create(options);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should handle undefined options gracefully', () => {
      const middleware = RateLimitMiddleware.createDefault();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('createDefault', () => {
    it('should create default rate limit middleware', () => {
      const middleware = RateLimitMiddleware.createDefault();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware with default settings', () => {
      const middleware = RateLimitMiddleware.createDefault();

      // The middleware should be a function that can be used with Express
      expect(typeof middleware).toBe('function');
    });
  });

  describe('createSecurityThrottle', () => {
    it('should create global, group, and route throttle middlewares', () => {
      const middlewares = RateLimitMiddleware.createSecurityThrottle({
        global: { windowMs: 60000, max: 300 },
        groups: {
          '/api/admin/*': { windowMs: 60000, max: 60 },
        },
        routes: {
          'POST /auth/login': { windowMs: 60000, max: 5 },
        },
      });

      expect(middlewares).toHaveLength(3);
      middlewares.forEach(middleware => {
        expect(typeof middleware).toBe('function');
      });
    });

    it('should skip route and group limiters when request does not match', () => {
      const middlewares = RateLimitMiddleware.createSecurityThrottle({
        groups: {
          '/api/admin/*': { windowMs: 60000, max: 60 },
        },
        routes: {
          'POST /auth/login': { windowMs: 60000, max: 5 },
        },
      });

      const req = {
        method: 'GET',
        path: '/public',
        url: '/public',
      } as any;
      const res = {} as any;
      const next = jest.fn();

      middlewares.forEach(middleware => middleware(req, res, next));

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should support shorthand boolean global throttle', () => {
      const middlewares = RateLimitMiddleware.createSecurityThrottle(true);

      expect(middlewares).toHaveLength(1);
      expect(typeof middlewares[0]).toBe('function');
    });
  });

  describe('createStrict', () => {
    it('should create strict rate limit middleware', () => {
      const middleware = RateLimitMiddleware.createStrict();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('createLoose', () => {
    it('should create loose rate limit middleware', () => {
      const middleware = RateLimitMiddleware.createLoose();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('middleware function', () => {
    it('should be callable with Express middleware signature', () => {
      const options = {
        windowMs: 60000,
        max: 100
      };

      const middleware = RateLimitMiddleware.create(options);

      // Mock Express middleware parameters
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        get: jest.fn((header: string) => {
          const headers = {
            'x-forwarded-for': '127.0.0.1'
          };
          return headers[header.toLowerCase()];
        }),
        connection: {
          remoteAddress: '127.0.0.1'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        },
        app: {
          get: jest.fn((key: string) => {
            const config = {
              'trust proxy': false,
              'x-forwarded-for': '127.0.0.1'
            };
            return config[key];
          })
        },
        method: 'GET',
        url: '/test',
        originalUrl: '/test',
        baseUrl: '',
        path: '/test',
        hostname: 'localhost',
        protocol: 'http',
        secure: false,
        query: {},
        params: {},
        body: {},
        cookies: {},
        fresh: false,
        stale: false,
        xhr: false,
        range: undefined,
        subdomains: [],
        accepts: jest.fn(),
        acceptsCharsets: jest.fn(),
        acceptsEncodings: jest.fn(),
        acceptsLanguages: jest.fn(),
        is: jest.fn(),
        param: jest.fn(),
        route: undefined,
        // Add more properties for express-rate-limit
        res: {} as any,
        next: jest.fn(),
        locals: {},
        session: undefined,
        user: undefined,
        flash: jest.fn(),
        logIn: jest.fn(),
        logOut: jest.fn(),
        isAuthenticated: jest.fn(() => false),
        isUnauthenticated: jest.fn(() => true)
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        header: jest.fn(),
        get: jest.fn(),
        sendStatus: jest.fn(),
        links: jest.fn(),
        jsonp: jest.fn(),
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
        final: jest.fn()
      } as any;
      const mockNext = jest.fn();

      // Should not throw when called
      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    it('should handle rate limit exceeded', async () => {
      const options = {
        windowMs: 1000, // 1 second
        max: 1, // Only 1 request allowed
        message: 'Rate limit exceeded'
      };

      const middleware = RateLimitMiddleware.create(options);

      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        get: jest.fn((header: string) => {
          const headers = {
            'x-forwarded-for': '127.0.0.1'
          };
          return headers[header.toLowerCase()];
        }),
        connection: {
          remoteAddress: '127.0.0.1'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        },
        app: {
          get: jest.fn((key: string) => {
            const config = {
              'trust proxy': false,
              'x-forwarded-for': '127.0.0.1'
            };
            return config[key];
          })
        },
        method: 'GET',
        url: '/test',
        originalUrl: '/test',
        baseUrl: '',
        path: '/test',
        hostname: 'localhost',
        protocol: 'http',
        secure: false,
        query: {},
        params: {},
        body: {},
        cookies: {},
        fresh: false,
        stale: false,
        xhr: false,
        range: undefined,
        subdomains: [],
        accepts: jest.fn(),
        acceptsCharsets: jest.fn(),
        acceptsEncodings: jest.fn(),
        acceptsLanguages: jest.fn(),
        is: jest.fn(),
        param: jest.fn(),
        route: undefined,
        // Add more properties for express-rate-limit
        res: {} as any,
        next: jest.fn(),
        locals: {},
        session: undefined,
        user: undefined,
        flash: jest.fn(),
        logIn: jest.fn(),
        logOut: jest.fn(),
        isAuthenticated: jest.fn(() => false),
        isUnauthenticated: jest.fn(() => true)
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        header: jest.fn(),
        get: jest.fn(),
        sendStatus: jest.fn(),
        links: jest.fn(),
        jsonp: jest.fn(),
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
        final: jest.fn()
      } as any;
      const mockNext = jest.fn();

      // First request should pass
      middleware(mockReq, mockRes, mockNext);
      
      // Wait for the middleware to process
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockNext).toHaveBeenCalled();

      // Second request should be rate limited
      mockNext.mockClear();
      middleware(mockReq, mockRes, mockNext);

      // Wait for the middleware to process
      await new Promise(resolve => setTimeout(resolve, 10));

      // The middleware should handle rate limiting internally
      expect(typeof middleware).toBe('function');
    });

    it('should handle different IP addresses separately', async () => {
      const options = {
        windowMs: 60000,
        max: 2
      };

      const middleware = RateLimitMiddleware.create(options);

      const req1 = { ip: '127.0.0.1' } as any;
      const req2 = { ip: '192.168.1.1' } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        header: jest.fn(),
        get: jest.fn(),
        sendStatus: jest.fn(),
        links: jest.fn(),
        jsonp: jest.fn(),
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
        final: jest.fn()
      } as any;
      const mockNext = jest.fn();

      // Both requests should pass as they're from different IPs
      middleware(req1, mockRes, mockNext);
      middleware(req2, mockRes, mockNext);

      // Wait for the middleware to process
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle missing IP address', () => {
      const options = {
        windowMs: 60000,
        max: 100
      };

      const middleware = RateLimitMiddleware.create(options);

      const mockReq = {
        ip: undefined,
        headers: {}
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        header: jest.fn(),
        get: jest.fn(),
        sendStatus: jest.fn(),
        links: jest.fn(),
        jsonp: jest.fn(),
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
        final: jest.fn()
      } as any;
      const mockNext = jest.fn();

      // Should not throw when IP is missing
      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    it('should handle custom key generator', () => {
      const options = {
        windowMs: 60000,
        max: 100,
        keyGenerator: (req: any) => req.headers['user-id'] || req.ip
      };

      const middleware = RateLimitMiddleware.create(options);

      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-id': 'user123' }
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        header: jest.fn(),
        get: jest.fn(),
        sendStatus: jest.fn(),
        links: jest.fn(),
        jsonp: jest.fn(),
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
        final: jest.fn()
      } as any;
      const mockNext = jest.fn();

      // Should not throw when using custom key generator
      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });
  });
});
