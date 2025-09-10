import { Request, Response, NextFunction } from 'express';
import { SecurityHeadersMiddleware, createSecurityHeadersMiddleware, securityPresets } from '../headers-middleware';
import { SecurityHeadersConfig } from '../types';

// Mock Express request/response
const createMockReq = (): Partial<Request> => ({
  method: 'GET',
  path: '/api/test',
  url: '/api/test'
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {
    setHeader: jest.fn(),
    statusCode: 200
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('SecurityHeadersMiddleware', () => {
  let config: SecurityHeadersConfig;
  let middleware: SecurityHeadersMiddleware;

  beforeEach(() => {
    config = {
      enabled: true,
      headers: {
        contentSecurityPolicy: "default-src 'self'",
        frameOptions: 'DENY',
        contentTypeOptions: true,
        xssProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
        strictTransportSecurity: 'max-age=31536000',
        permissionsPolicy: 'geolocation=()',
        crossOriginEmbedderPolicy: 'require-corp',
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin'
      },
      customHeaders: {
        'X-Custom-Header': 'test-value'
      }
    };
    middleware = new SecurityHeadersMiddleware(config);
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

    it('should set security headers', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'self'");
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000');
      expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', 'geolocation=()');
      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-origin');
      expect(res.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'test-value');
    });

    it('should not set headers when disabled', () => {
      const disabledConfig: SecurityHeadersConfig = {
        ...config,
        enabled: false
      };
      const disabledMiddleware = new SecurityHeadersMiddleware(disabledConfig);
      
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = disabledMiddleware.middleware();
      middlewareFn(req, res, next);
      
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should skip disabled headers', () => {
      const partialConfig: SecurityHeadersConfig = {
        enabled: true,
        headers: {
          contentSecurityPolicy: false,
          frameOptions: false,
          contentTypeOptions: false,
          xssProtection: false,
          referrerPolicy: false,
          strictTransportSecurity: false,
          permissionsPolicy: false,
          crossOriginEmbedderPolicy: false,
          crossOriginOpenerPolicy: false,
          crossOriginResourcePolicy: false
        }
      };
      const partialMiddleware = new SecurityHeadersMiddleware(partialConfig);
      
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = partialMiddleware.middleware();
      middlewareFn(req, res, next);
      
      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        headers: {
          contentSecurityPolicy: "default-src 'none'"
        }
      };
      
      middleware.updateConfig(newConfig);
      
      const updatedConfig = middleware.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.headers.contentSecurityPolicy).toBe("default-src 'none'");
    });

    it('should get current configuration', () => {
      const currentConfig = middleware.getConfig();
      expect(currentConfig).toEqual(config);
    });
  });
});

describe('createSecurityHeadersMiddleware', () => {
  it('should create SecurityHeadersMiddleware instance', () => {
    const testConfig: SecurityHeadersConfig = {
      enabled: true,
      headers: {
        contentSecurityPolicy: "default-src 'self'",
        frameOptions: 'DENY',
        contentTypeOptions: true
      }
    };
    const middleware = createSecurityHeadersMiddleware(testConfig);
    expect(middleware).toBeInstanceOf(SecurityHeadersMiddleware);
  });
});

describe('securityPresets', () => {
  it('should have strict preset', () => {
    expect(securityPresets.strict).toBeDefined();
    expect(securityPresets.strict.enabled).toBe(true);
    expect(securityPresets.strict.headers.contentSecurityPolicy).toContain("default-src 'self'");
  });

  it('should have balanced preset', () => {
    expect(securityPresets.balanced).toBeDefined();
    expect(securityPresets.balanced.enabled).toBe(true);
    expect(securityPresets.balanced.headers.strictTransportSecurity).toBe(false);
  });

  it('should have minimal preset', () => {
    expect(securityPresets.minimal).toBeDefined();
    expect(securityPresets.minimal.enabled).toBe(true);
    expect(securityPresets.minimal.headers.contentSecurityPolicy).toBe(false);
  });
});
