import { Request, Response, NextFunction } from 'express';
import { SecurityMiddleware, createSecurityMiddleware, createSecurityEndpoints } from '../security-middleware';
import { SecurityConfig, SecurityContext } from '../types';

// Mock the sub-middlewares
jest.mock('../headers-middleware');
jest.mock('../csrf-middleware');
jest.mock('../sanitization-middleware');

describe('SecurityMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      secure: false,
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-proto': 'https',
        referer: 'https://example.com',
        origin: 'https://example.com'
      },
      ip: '127.0.0.1',
      connection: {
        remoteAddress: '127.0.0.1'
      } as any
    };
    
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    // Mock the sub-middlewares
    const mockHeadersMiddleware = {
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
      updateConfig: jest.fn()
    };
    
    const mockCSRFMiddleware = {
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
      updateConfig: jest.fn(),
      generateToken: jest.fn().mockReturnValue('mock-csrf-token')
    };
    
    const mockSanitizationMiddleware = {
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
      updateConfig: jest.fn(),
      getViolations: jest.fn().mockReturnValue([]),
      getViolationStats: jest.fn().mockReturnValue({ total: 0, byType: {} }),
      clearViolations: jest.fn()
    };

    // Mock the constructors
    (require('../headers-middleware').SecurityHeadersMiddleware as jest.Mock).mockImplementation(() => mockHeadersMiddleware);
    (require('../csrf-middleware').CSRFMiddleware as jest.Mock).mockImplementation(() => mockCSRFMiddleware);
    (require('../sanitization-middleware').SanitizationMiddleware as jest.Mock).mockImplementation(() => mockSanitizationMiddleware);
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      securityMiddleware = new SecurityMiddleware();
      expect(securityMiddleware).toBeInstanceOf(SecurityMiddleware);
    });

    it('should create instance with custom config', () => {
      const customConfig: SecurityConfig = {
        enabled: true,
        headers: { 
          enabled: true,
          headers: {
            contentSecurityPolicy: "default-src 'self'",
            frameOptions: 'DENY' as const,
            xssProtection: '1; mode=block' as const,
            strictTransportSecurity: 'max-age=31536000; includeSubDomains',
            referrerPolicy: 'strict-origin-when-cross-origin' as const,
            permissionsPolicy: 'geolocation=(), microphone=()',
            crossOriginEmbedderPolicy: 'require-corp' as const,
            crossOriginOpenerPolicy: 'same-origin' as const,
            crossOriginResourcePolicy: 'same-origin' as const
          }
        },
        csrf: { enabled: true, secret: 'test' },
        sanitization: { 
          enabled: true,
          options: {
            stripHtml: true,
            escapeHtml: true,
            escapeSql: true,
            preventPathTraversal: true,
            validateFileUploads: true
          },
          customSanitizers: {}
        }
      };
      
      securityMiddleware = new SecurityMiddleware(customConfig);
      expect(securityMiddleware).toBeInstanceOf(SecurityMiddleware);
    });
  });

  describe('middleware()', () => {
    beforeEach(() => {
      securityMiddleware = new SecurityMiddleware();
    });

    it('should return middleware function', () => {
      const middleware = securityMiddleware.middleware();
      expect(typeof middleware).toBe('function');
    });

    it('should skip processing when disabled', () => {
      securityMiddleware = new SecurityMiddleware({ enabled: false });
      const middleware = securityMiddleware.middleware();
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should add security context to request', () => {
      const middleware = securityMiddleware.middleware();
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as any).securityContext).toBeDefined();
      expect((mockRequest as any).securityContext).toMatchObject({
        isSecure: true,
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        referer: 'https://example.com',
        origin: 'https://example.com'
      });
    });

    it('should detect secure connection from x-forwarded-proto', () => {
      const middleware = securityMiddleware.middleware();
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as any).securityContext.isSecure).toBe(true);
    });

    it('should detect secure connection from req.secure', () => {
      (mockRequest as any).secure = true;
      mockRequest.headers!['x-forwarded-proto'] = undefined;
      
      const middleware = securityMiddleware.middleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as any).securityContext.isSecure).toBe(true);
    });

    it('should use connection.remoteAddress when ip is not available', () => {
      (mockRequest as any).ip = undefined;
      
      const middleware = securityMiddleware.middleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as any).securityContext.ip).toBe('127.0.0.1');
    });

    it('should handle missing headers gracefully', () => {
      mockRequest.headers = {};
      
      const middleware = securityMiddleware.middleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as any).securityContext).toMatchObject({
        isSecure: false,
        userAgent: undefined,
        referer: undefined,
        origin: undefined
      });
    });

    it('should call all sub-middlewares in sequence', () => {
      const middleware = securityMiddleware.middleware();
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify that all sub-middlewares were called
      const headersMiddleware = securityMiddleware.getHeadersMiddleware();
      const csrfMiddleware = securityMiddleware.getCSRFMiddleware();
      const sanitizationMiddleware = securityMiddleware.getSanitizationMiddleware();
      
      expect(headersMiddleware.middleware).toHaveBeenCalled();
      expect(csrfMiddleware.middleware).toHaveBeenCalled();
      expect(sanitizationMiddleware.middleware).toHaveBeenCalled();
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      securityMiddleware = new SecurityMiddleware();
    });

    it('should return headers middleware', () => {
      const headersMiddleware = securityMiddleware.getHeadersMiddleware();
      expect(headersMiddleware).toBeDefined();
    });

    it('should return CSRF middleware', () => {
      const csrfMiddleware = securityMiddleware.getCSRFMiddleware();
      expect(csrfMiddleware).toBeDefined();
    });

    it('should return sanitization middleware', () => {
      const sanitizationMiddleware = securityMiddleware.getSanitizationMiddleware();
      expect(sanitizationMiddleware).toBeDefined();
    });

    it('should return security violations', () => {
      const violations = securityMiddleware.getSecurityViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should return security stats', () => {
      const stats = securityMiddleware.getSecurityStats();
      expect(stats).toHaveProperty('violations');
      expect(stats).toHaveProperty('config');
    });

    it('should return current config', () => {
      const config = securityMiddleware.getConfig();
      expect(config).toBeDefined();
      expect(config).toHaveProperty('enabled');
    });
  });

  describe('updateConfig()', () => {
    beforeEach(() => {
      securityMiddleware = new SecurityMiddleware();
    });

    it('should update configuration', () => {
      const newConfig = { enabled: false };
      securityMiddleware.updateConfig(newConfig);
      
      const config = securityMiddleware.getConfig();
      expect(config.enabled).toBe(false);
    });

    it('should update headers config', () => {
      const newConfig = { 
        headers: { 
          enabled: false,
          headers: {
            contentSecurityPolicy: "default-src 'self'",
            frameOptions: 'DENY' as const,
            xssProtection: '1; mode=block' as const,
            strictTransportSecurity: 'max-age=31536000; includeSubDomains',
            referrerPolicy: 'strict-origin-when-cross-origin' as const,
            permissionsPolicy: 'geolocation=(), microphone=()',
            crossOriginEmbedderPolicy: 'require-corp' as const,
            crossOriginOpenerPolicy: 'same-origin' as const,
            crossOriginResourcePolicy: 'same-origin' as const
          }
        } 
      };
      securityMiddleware.updateConfig(newConfig);
      
      const headersMiddleware = securityMiddleware.getHeadersMiddleware();
      expect(headersMiddleware.updateConfig).toHaveBeenCalledWith(newConfig.headers);
    });

    it('should update CSRF config', () => {
      const newConfig = { csrf: { enabled: false, secret: 'new-secret' } };
      securityMiddleware.updateConfig(newConfig);
      
      const csrfMiddleware = securityMiddleware.getCSRFMiddleware();
      expect(csrfMiddleware.updateConfig).toHaveBeenCalledWith(newConfig.csrf);
    });

    it('should update sanitization config', () => {
      const newConfig = { 
        sanitization: { 
          enabled: false,
          options: {
            stripHtml: true,
            escapeHtml: true,
            escapeSql: true,
            preventPathTraversal: true,
            validateFileUploads: true
          },
          customSanitizers: {}
        } 
      };
      securityMiddleware.updateConfig(newConfig);
      
      const sanitizationMiddleware = securityMiddleware.getSanitizationMiddleware();
      expect(sanitizationMiddleware.updateConfig).toHaveBeenCalledWith(newConfig.sanitization);
    });

    it('should handle partial updates', () => {
      const originalConfig = securityMiddleware.getConfig();
      const newConfig = { enabled: false };
      
      securityMiddleware.updateConfig(newConfig);
      
      const updatedConfig = securityMiddleware.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.headers).toEqual(originalConfig.headers);
    });
  });

  describe('clearViolations()', () => {
    beforeEach(() => {
      securityMiddleware = new SecurityMiddleware();
    });

    it('should clear security violations', () => {
      securityMiddleware.clearViolations();
      
      const sanitizationMiddleware = securityMiddleware.getSanitizationMiddleware();
      expect(sanitizationMiddleware.clearViolations).toHaveBeenCalled();
    });
  });
});

describe('createSecurityMiddleware', () => {
  it('should create SecurityMiddleware instance', () => {
    const middleware = createSecurityMiddleware();
    expect(middleware).toBeInstanceOf(SecurityMiddleware);
  });

  it('should create SecurityMiddleware with config', () => {
    const config: SecurityConfig = { enabled: false };
    const middleware = createSecurityMiddleware(config);
    expect(middleware).toBeInstanceOf(SecurityMiddleware);
  });
});

describe('createSecurityEndpoints', () => {
  let securityMiddleware: SecurityMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware();
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('csrfToken endpoint', () => {
    it('should return CSRF token', () => {
      const endpoints = createSecurityEndpoints(securityMiddleware);
      
      endpoints.csrfToken(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        csrfToken: 'mock-csrf-token'
      });
    });
  });

  describe('violations endpoint', () => {
    it('should return security violations and stats', () => {
      const endpoints = createSecurityEndpoints(securityMiddleware);
      
      endpoints.violations(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        violations: [],
        stats: expect.objectContaining({
          violations: expect.any(Object),
          config: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });
  });

  describe('status endpoint', () => {
    it('should return security status', () => {
      const endpoints = createSecurityEndpoints(securityMiddleware);
      
      endpoints.status(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        enabled: true,
        features: {
          headers: true,
          csrf: true,
          sanitization: true
        },
        stats: expect.objectContaining({
          violations: expect.any(Object),
          config: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });

    it('should return correct feature status when enabled', () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: { 
          enabled: true,
          headers: {
            contentSecurityPolicy: "default-src 'self'",
            frameOptions: 'DENY' as const,
            xssProtection: '1; mode=block' as const,
            strictTransportSecurity: 'max-age=31536000; includeSubDomains',
            referrerPolicy: 'strict-origin-when-cross-origin' as const,
            permissionsPolicy: 'geolocation=(), microphone=()',
            crossOriginEmbedderPolicy: 'require-corp' as const,
            crossOriginOpenerPolicy: 'same-origin' as const,
            crossOriginResourcePolicy: 'same-origin' as const
          }
        },
        csrf: { enabled: true, secret: 'test' },
        sanitization: { 
          enabled: true,
          options: {
            stripHtml: true,
            escapeHtml: true,
            escapeSql: true,
            preventPathTraversal: true,
            validateFileUploads: true
          },
          customSanitizers: {}
        }
      };
      
      securityMiddleware = new SecurityMiddleware(config);
      const endpoints = createSecurityEndpoints(securityMiddleware);
      
      endpoints.status(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        enabled: true,
        features: {
          headers: true,
          csrf: true,
          sanitization: true
        },
        stats: expect.objectContaining({
          violations: expect.any(Object),
          config: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });
  });
});

describe('SecurityMiddleware Integration', () => {
  let securityMiddleware: SecurityMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware();
    mockRequest = {
      secure: false,
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-proto': 'https'
      },
      ip: '127.0.0.1'
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should handle middleware chain errors', () => {
    // Mock headers middleware to throw error
    const mockHeadersMiddleware = {
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next(new Error('Headers error')))
    };
    (require('../headers-middleware').SecurityHeadersMiddleware as jest.Mock).mockImplementation(() => mockHeadersMiddleware);
    
    securityMiddleware = new SecurityMiddleware();
    const middleware = securityMiddleware.middleware();
    
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle CSRF middleware errors', () => {
    // Mock CSRF middleware to throw error
    const mockCSRFMiddleware = {
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next(new Error('CSRF error')))
    };
    (require('../csrf-middleware').CSRFMiddleware as jest.Mock).mockImplementation(() => mockCSRFMiddleware);
    
    securityMiddleware = new SecurityMiddleware();
    const middleware = securityMiddleware.middleware();
    
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle sanitization middleware errors', () => {
    // Mock sanitization middleware to throw error
    const mockSanitizationMiddleware = {
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next(new Error('Sanitization error')))
    };
    (require('../sanitization-middleware').SanitizationMiddleware as jest.Mock).mockImplementation(() => mockSanitizationMiddleware);
    
    securityMiddleware = new SecurityMiddleware();
    const middleware = securityMiddleware.middleware();
    
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
