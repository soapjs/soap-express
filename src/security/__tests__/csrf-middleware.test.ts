import { Request, Response, NextFunction } from 'express';
import { CSRFMiddleware, createCSRFMiddleware, createCSRFTokenEndpoint } from '../csrf-middleware';
import { CSRFConfig } from '../types';

// Mock Express request/response
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  path: '/api/test',
  url: '/api/test',
  cookies: {},
  headers: {},
  body: {},
  query: {},
  ...overrides
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {
    cookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {}
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('CSRFMiddleware', () => {
  let config: CSRFConfig;
  let middleware: CSRFMiddleware;

  beforeEach(() => {
    config = {
      enabled: true,
      secret: 'test-secret',
      cookieName: '_csrf',
      cookieOptions: {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 3600000
      },
      tokenLength: 32,
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      ignorePaths: ['/health'],
      headerName: 'x-csrf-token',
      bodyName: '_csrf',
      queryName: '_csrf'
    };
    middleware = new CSRFMiddleware(config);
  });

  describe('middleware function', () => {
    it('should return Express middleware function', () => {
      const middlewareFn = middleware.middleware();
      expect(typeof middlewareFn).toBe('function');
    });

    it('should call next function', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should skip CSRF check for ignored methods', () => {
      const req = createMockReq({ method: 'GET' }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
      // For GET requests, CSRF token should still be generated
      expect(res.cookie).toHaveBeenCalled();
    });

    it('should skip CSRF check for ignored paths', () => {
      const req = createMockReq({ path: '/health' }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should generate CSRF token when not present', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(res.cookie).toHaveBeenCalledWith('_csrf', expect.any(String), expect.any(Object));
      expect(res.locals.csrfToken).toBeDefined();
    });

    it('should verify CSRF token for POST requests', () => {
      const token = 'test-token';
      const hashedToken = require('crypto').createHmac('sha256', 'test-secret').update(token).digest('hex');
      
      const req = createMockReq({
        method: 'POST',
        cookies: { _csrf: hashedToken },
        headers: { 'x-csrf-token': token }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid CSRF token', () => {
      const req = createMockReq({
        method: 'POST',
        cookies: { _csrf: 'invalid-token' },
        headers: { 'x-csrf-token': 'test-token' }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CSRF token mismatch',
        message: 'Invalid or missing CSRF token',
        code: 'CSRF_TOKEN_MISMATCH'
      });
    });

    it('should not verify CSRF when disabled', () => {
      const disabledConfig: CSRFConfig = {
        ...config,
        enabled: false
      };
      const disabledMiddleware = new CSRFMiddleware(disabledConfig);
      
      const req = createMockReq({ method: 'POST' }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = disabledMiddleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('token generation and verification', () => {
    it('should generate valid CSRF token', () => {
      const token = middleware.generateToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32);
    });

    it('should verify valid token', () => {
      const token = 'test-token';
      const hashedToken = require('crypto').createHmac('sha256', 'test-secret').update(token).digest('hex');
      
      const isValid = middleware.verifyToken(token, hashedToken);
      expect(isValid).toBe(true);
    });

    it('should reject invalid token', () => {
      const token = 'test-token';
      const invalidHashedToken = 'invalid-hash';
      
      const isValid = middleware.verifyToken(token, invalidHashedToken);
      expect(isValid).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        secret: 'new-secret'
      };
      
      middleware.updateConfig(newConfig);
      
      const updatedConfig = middleware.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.secret).toBe('new-secret');
    });

    it('should get current configuration', () => {
      const currentConfig = middleware.getConfig();
      expect(currentConfig).toEqual(config);
    });
  });
});

describe('createCSRFMiddleware', () => {
  it('should create CSRFMiddleware instance', () => {
    const testConfig: CSRFConfig = {
      enabled: true,
      secret: 'test-secret',
      cookieName: '_csrf'
    };
    const middleware = createCSRFMiddleware(testConfig);
    expect(middleware).toBeInstanceOf(CSRFMiddleware);
  });
});

describe('createCSRFTokenEndpoint', () => {
  it('should create CSRF token endpoint', () => {
    const testConfig: CSRFConfig = {
      enabled: true,
      secret: 'test-secret',
      cookieName: '_csrf'
    };
    const testMiddleware = createCSRFMiddleware(testConfig);
    const endpoint = createCSRFTokenEndpoint(testMiddleware);
    expect(typeof endpoint).toBe('function');
    
    const req = createMockReq() as Request;
    const res = createMockRes() as Response;
    
    endpoint(req, res);
    
    expect(res.cookie).toHaveBeenCalledWith('_csrf', expect.any(String), expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ csrfToken: expect.any(String) });
  });
});
