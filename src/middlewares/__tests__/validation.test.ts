import { ValidationMiddleware } from '../validation';
import { Request, Response, NextFunction } from 'express';

// Mock Joi schema for testing
const mockSchema = {
  validate: jest.fn()
};

describe('ValidationMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: { name: 'test', email: 'test@example.com' },
      query: { page: '1', limit: '10' },
      params: { id: '123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    
    // Reset mock
    mockSchema.validate.mockClear();
  });

  describe('create', () => {
    it('should create validation middleware', () => {
      const middleware = ValidationMiddleware.create(mockSchema);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should pass validation and call next()', async () => {
      mockSchema.validate.mockReturnValue({
        error: null,
        value: { name: 'test', email: 'test@example.com' }
      });

      const middleware = ValidationMiddleware.create(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSchema.validate).toHaveBeenCalledWith(mockReq.body);
      expect(mockReq.body).toEqual({ name: 'test', email: 'test@example.com' });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 on validation error', async () => {
      const validationError = {
        details: [
          { path: ['email'], message: 'Email is required' },
          { path: ['name'], message: 'Name must be a string' }
        ]
      };
      mockSchema.validate.mockReturnValue({
        error: validationError,
        value: null
      });

      const middleware = ValidationMiddleware.create(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: [
          { field: 'email', message: 'Email is required' },
          { field: 'name', message: 'Name must be a string' }
        ]
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on validation exception', async () => {
      mockSchema.validate.mockImplementation(() => {
        throw new Error('Schema validation error');
      });

      const middleware = ValidationMiddleware.create(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty validation details', async () => {
      const validationError = {
        details: []
      };
      mockSchema.validate.mockReturnValue({
        error: validationError,
        value: null
      });

      const middleware = ValidationMiddleware.create(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: []
      });
    });
  });

  describe('createQuery', () => {
    it('should create query validation middleware', () => {
      const middleware = ValidationMiddleware.createQuery(mockSchema);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should validate query parameters', async () => {
      mockSchema.validate.mockReturnValue({
        error: null,
        value: { page: 1, limit: 10 }
      });

      const middleware = ValidationMiddleware.createQuery(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSchema.validate).toHaveBeenCalledWith({ page: '1', limit: '10' });
      expect(mockReq.query).toEqual({ page: 1, limit: 10 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 on query validation error', async () => {
      const validationError = {
        details: [
          { path: ['page'], message: 'Page must be a number' }
        ]
      };
      mockSchema.validate.mockReturnValue({
        error: validationError,
        value: null
      });

      const middleware = ValidationMiddleware.createQuery(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Query validation failed',
        details: [
          { field: 'page', message: 'Page must be a number' }
        ]
      });
    });

    it('should return 500 on query validation exception', async () => {
      mockSchema.validate.mockImplementation(() => {
        throw new Error('Query validation error');
      });

      const middleware = ValidationMiddleware.createQuery(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Query validation error' });
    });
  });

  describe('createParams', () => {
    it('should create params validation middleware', () => {
      const middleware = ValidationMiddleware.createParams(mockSchema);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should validate route parameters', async () => {
      mockSchema.validate.mockReturnValue({
        error: null,
        value: { id: 123 }
      });

      const middleware = ValidationMiddleware.createParams(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSchema.validate).toHaveBeenCalledWith({ id: '123' });
      expect(mockReq.params).toEqual({ id: 123 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 on params validation error', async () => {
      const validationError = {
        details: [
          { path: ['id'], message: 'ID must be a valid UUID' }
        ]
      };
      mockSchema.validate.mockReturnValue({
        error: validationError,
        value: null
      });

      const middleware = ValidationMiddleware.createParams(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Parameter validation failed',
        details: [
          { field: 'id', message: 'ID must be a valid UUID' }
        ]
      });
    });

    it('should return 500 on params validation exception', async () => {
      mockSchema.validate.mockImplementation(() => {
        throw new Error('Params validation error');
      });

      const middleware = ValidationMiddleware.createParams(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Parameter validation error' });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined request body', async () => {
      mockReq.body = undefined;
      mockSchema.validate.mockReturnValue({
        error: null,
        value: undefined
      });

      const middleware = ValidationMiddleware.create(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSchema.validate).toHaveBeenCalledWith(undefined);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined query parameters', async () => {
      mockReq.query = undefined;
      mockSchema.validate.mockReturnValue({
        error: null,
        value: undefined
      });

      const middleware = ValidationMiddleware.createQuery(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSchema.validate).toHaveBeenCalledWith(undefined);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined route parameters', async () => {
      mockReq.params = undefined;
      mockSchema.validate.mockReturnValue({
        error: null,
        value: undefined
      });

      const middleware = ValidationMiddleware.createParams(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSchema.validate).toHaveBeenCalledWith(undefined);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle complex validation error paths', async () => {
      const validationError = {
        details: [
          { path: ['user', 'profile', 'email'], message: 'Email is invalid' },
          { path: ['items', 0, 'name'], message: 'Item name is required' }
        ]
      };
      mockSchema.validate.mockReturnValue({
        error: validationError,
        value: null
      });

      const middleware = ValidationMiddleware.create(mockSchema);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: [
          { field: 'user.profile.email', message: 'Email is invalid' },
          { field: 'items.0.name', message: 'Item name is required' }
        ]
      });
    });
  });
});
