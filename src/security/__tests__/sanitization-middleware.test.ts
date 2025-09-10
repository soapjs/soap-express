import { Request, Response, NextFunction } from 'express';
import { SanitizationMiddleware, createSanitizationMiddleware, createSecurityViolationsEndpoint } from '../sanitization-middleware';
import { InputSanitizationConfig } from '../types';

// Mock Express request/response
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'POST',
  path: '/api/test',
  url: '/api/test',
  body: {},
  query: {},
  params: {},
  files: null,
  ...overrides
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('SanitizationMiddleware', () => {
  let config: InputSanitizationConfig;
  let middleware: SanitizationMiddleware;

  beforeEach(() => {
    config = {
      enabled: true,
      options: {
        stripHtml: true,
        allowedTags: [],
        allowedAttributes: {},
        escapeSql: true,
        escapeHtml: true,
        preventPathTraversal: true,
        validateFileUploads: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        validateJson: true,
        maxJsonSize: 1024 * 1024 // 1MB
      }
    };
    middleware = new SanitizationMiddleware(config);
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

    it('should sanitize request body', () => {
      const req = createMockReq({
        body: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          description: '<p>Hello <b>World</b></p>'
        }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(req.body.name).toBe('alert(&quot;xss&quot;)');
      expect(req.body.email).toBe('test@example.com');
      expect(req.body.description).toBe('Hello World');
    });

    it('should sanitize query parameters', () => {
      const req = createMockReq({
        query: {
          search: '<script>alert("xss")</script>',
          filter: '../../../etc/passwd'
        }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(req.query.search).toBe('alert(&quot;xss&quot;)');
      expect(req.query.filter).toBe('&#x2F;&#x2F;&#x2F;etc&#x2F;passwd');
    });

    it('should sanitize route parameters', () => {
      const req = createMockReq({
        params: {
          id: '<script>alert("xss")</script>',
          path: '../../../etc/passwd'
        }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(req.params.id).toBe('alert(&quot;xss&quot;)');
      expect(req.params.path).toBe('&#x2F;&#x2F;&#x2F;etc&#x2F;passwd');
    });

    it('should validate file uploads', () => {
      const req = createMockReq({
        files: {
          avatar: [{
            fieldname: 'avatar',
            originalname: 'test.jpg',
            mimetype: 'image/jpeg',
            size: 1024 * 1024, // 1MB
            buffer: Buffer.from('test'),
            encoding: '7bit'
          }]
        }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid file uploads', () => {
      const req = createMockReq({
        files: {
          avatar: [{
            fieldname: 'avatar',
            originalname: 'test.exe',
            mimetype: 'application/x-executable',
            size: 1024 * 1024,
            buffer: Buffer.from('test'),
            encoding: '7bit'
          }]
        }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Input sanitization failed',
        message: expect.stringContaining('File type'),
        code: 'SANITIZATION_ERROR'
      });
    });

    it('should not sanitize when disabled', () => {
      const disabledConfig: InputSanitizationConfig = {
        ...config,
        enabled: false
      };
      const disabledMiddleware = new SanitizationMiddleware(disabledConfig);
      
      const req = createMockReq({
        body: { name: '<script>alert("xss")</script>' }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = disabledMiddleware.middleware();
      middlewareFn(req, res, next);
      
      expect(req.body.name).toBe('<script>alert("xss")</script>');
    });
  });

  describe('violation tracking', () => {
    it('should track security violations', () => {
      const req = createMockReq({
        body: { name: '<script>alert("xss")</script>' }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      const violations = middleware.getViolations();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('xss');
    });

    it('should get violation statistics', () => {
      const req = createMockReq({
        body: { name: '<script>alert("xss")</script>' }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      const stats = middleware.getViolationStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType.xss).toBeGreaterThan(0);
    });

    it('should clear violations', () => {
      const req = createMockReq({
        body: { name: '<script>alert("xss")</script>' }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(middleware.getViolations().length).toBeGreaterThan(0);
      
      middleware.clearViolations();
      expect(middleware.getViolations().length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        options: {
          stripHtml: false
        }
      };
      
      middleware.updateConfig(newConfig);
      
      const updatedConfig = middleware.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.options.stripHtml).toBe(false);
    });

    it('should get current configuration', () => {
      const currentConfig = middleware.getConfig();
      expect(currentConfig).toEqual(config);
    });
  });
});

describe('createSanitizationMiddleware', () => {
  it('should create SanitizationMiddleware instance', () => {
    const testConfig: InputSanitizationConfig = {
      enabled: true,
      options: {
        stripHtml: true,
        escapeHtml: true,
        preventPathTraversal: true
      }
    };
    const middleware = createSanitizationMiddleware(testConfig);
    expect(middleware).toBeInstanceOf(SanitizationMiddleware);
  });
});

describe('createSecurityViolationsEndpoint', () => {
  it('should create security violations endpoint', () => {
    const testConfig: InputSanitizationConfig = {
      enabled: true,
      options: {
        stripHtml: true,
        escapeHtml: true,
        preventPathTraversal: true
      }
    };
    const testMiddleware = createSanitizationMiddleware(testConfig);
    const endpoint = createSecurityViolationsEndpoint(testMiddleware);
    expect(typeof endpoint).toBe('function');
    
    const req = createMockReq() as Request;
    const res = createMockRes() as Response;
    
    endpoint(req, res);
    
    expect(res.json).toHaveBeenCalledWith({
      violations: expect.any(Array),
      stats: expect.any(Object),
      timestamp: expect.any(String)
    });
  });
});
