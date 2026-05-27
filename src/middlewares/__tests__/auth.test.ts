import { AuthenticationMiddleware, AuthorizationMiddleware } from '../auth';
import { Request, Response, NextFunction } from 'express';

// Test verifier standing in for a real JWT verification function.
const verify = async (token: string) =>
  token === 'valid-token' ? { id: 'user-id', roles: ['user'] } : null;

describe('AuthenticationMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
      user: undefined
    } as any;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('create', () => {
    it('should call next() when authentication is not required', async () => {
      const options = { required: false };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', async () => {
      const options = { required: true, secret: 'test-secret' };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when no verifier is configured (fail closed)', async () => {
      mockReq.headers = { authorization: 'Bearer some-token' };
      const options = { required: true, secret: 'test-secret' };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token verifier configured' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when invalid token is provided', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      const options = { required: true, secret: 'test-secret', verify };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when valid token is provided', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      const options = { required: true, secret: 'test-secret', verify };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user).toEqual({ id: 'user-id', roles: ['user'] });
    });

    it('should return 403 when user lacks required roles', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      const options = {
        required: true,
        secret: 'test-secret',
        roles: ['admin'],
        verify
      };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has required roles', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      const options = {
        required: true,
        secret: 'test-secret',
        roles: ['user'],
        verify
      };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user).toEqual({ id: 'user-id', roles: ['user'] });
    });

    it('should handle multiple required roles', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      const options = {
        required: true,
        secret: 'test-secret',
        roles: ['admin', 'moderator'],
        verify
      };
      const middleware = AuthenticationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 401 on authentication error', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      const options = { required: true, secret: 'test-secret' };
      const middleware = AuthenticationMiddleware.create(options);

      // Mock an error in the middleware
      const originalExtractToken = (AuthenticationMiddleware as any).extractToken;
      (AuthenticationMiddleware as any).extractToken = jest.fn().mockImplementation(() => {
        throw new Error('Token extraction failed');
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication failed' });

      // Restore original method
      (AuthenticationMiddleware as any).extractToken = originalExtractToken;
    });
  });
});

describe('AuthorizationMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-id', roles: ['user'] }
    } as any;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('create', () => {
    it('should return 401 when user is not authenticated', async () => {
      (mockReq as any).user = undefined;
      const options = { resource: 'users', action: 'read' };
      const middleware = AuthorizationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has permission', async () => {
      (mockReq as any).user = { id: 'user-id', roles: ['admin'] };
      const options = { resource: 'users', action: 'read' };
      const middleware = AuthorizationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user lacks permission', async () => {
      (mockReq as any).user = { id: 'user-id', roles: ['user'] };
      const options = { resource: 'users', action: 'read' };
      const middleware = AuthorizationMiddleware.create(options);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on authorization error', async () => {
      (mockReq as any).user = { id: 'user-id', roles: ['user'] };
      const options = { resource: 'users', action: 'read' };
      const middleware = AuthorizationMiddleware.create(options);

      // Mock an error in the middleware
      const originalCheckPermission = (AuthorizationMiddleware as any).checkPermission;
      (AuthorizationMiddleware as any).checkPermission = jest.fn().mockImplementation(() => {
        throw new Error('Permission check failed');
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization failed' });

      // Restore original method
      (AuthorizationMiddleware as any).checkPermission = originalCheckPermission;
    });
  });
});
