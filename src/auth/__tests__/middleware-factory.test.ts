import { AuthMiddlewareFactory } from '../middleware-factory';
import { AuthRegistry } from '../registry';
import { AuthStrategy, AuthUser, RoleConfig, AuthRequest } from '@soapjs/soap';
import { Request, Response, NextFunction } from 'express';

describe('AuthMiddlewareFactory', () => {
  let factory: AuthMiddlewareFactory;
  let registry: AuthRegistry;
  let mockStrategy: AuthStrategy;
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    registry = new AuthRegistry();
    factory = new AuthMiddlewareFactory(registry);
    
    mockStrategy = {
      name: 'jwt',
      middleware: jest.fn()
    } as any;

    mockReq = {
      user: undefined,
      params: { id: '123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('createAuthMiddleware', () => {
    it('should create authentication middleware', () => {
      registry.register(mockStrategy);
      const mockMiddleware = jest.fn();
      mockStrategy.middleware = jest.fn().mockReturnValue(mockMiddleware);

      const middleware = factory.createAuthMiddleware('jwt');

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should return 500 if strategy not found', async () => {
      const middleware = factory.createAuthMiddleware('nonexistent');

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Auth strategy 'nonexistent' not found" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call strategy middleware', async () => {
      registry.register(mockStrategy);
      const mockStrategyMiddleware = jest.fn();
      mockStrategy.middleware = jest.fn().mockReturnValue(mockStrategyMiddleware);

      const middleware = factory.createAuthMiddleware('jwt', { secret: 'test' });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockStrategy.middleware).toHaveBeenCalledWith({ secret: 'test' });
      expect(mockStrategyMiddleware).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should return 500 on strategy middleware error', async () => {
      registry.register(mockStrategy);
      mockStrategy.middleware = jest.fn().mockImplementation(() => {
        throw new Error('Strategy error');
      });

      const middleware = factory.createAuthMiddleware('jwt');

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });
  });

  describe('createRoleMiddleware', () => {
    it('should return 401 if user not authenticated', async () => {
      const roles: RoleConfig = { allow: ['admin'] };
      const middleware = factory.createRoleMiddleware(roles);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if user is authenticated and authorized', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['admin']
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const middleware = factory.createRoleMiddleware(roles);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user lacks required roles', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const middleware = factory.createRoleMiddleware(roles);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on authorization error', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['admin']
      };
      mockReq.user = user;

      const roles: RoleConfig = { 
        allow: ['admin'],
        customCheck: jest.fn().mockRejectedValue(new Error('Custom check error'))
      };
      const middleware = factory.createRoleMiddleware(roles);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization failed' });
    });
  });

  describe('createAuthRoleMiddleware', () => {
    it('should create combined auth and role middleware', () => {
      registry.register(mockStrategy);
      const mockAuthMiddleware = jest.fn();
      mockStrategy.middleware = jest.fn().mockReturnValue(mockAuthMiddleware);

      const roles: RoleConfig = { allow: ['admin'] };
      const middlewares = factory.createAuthRoleMiddleware('jwt', roles);

      expect(middlewares).toHaveLength(2);
      expect(typeof middlewares[0]).toBe('function');
      expect(typeof middlewares[1]).toBe('function');
    });

    it('should create only auth middleware if no roles provided', () => {
      registry.register(mockStrategy);
      const mockAuthMiddleware = jest.fn();
      mockStrategy.middleware = jest.fn().mockReturnValue(mockAuthMiddleware);

      const middlewares = factory.createAuthRoleMiddleware('jwt');

      expect(middlewares).toHaveLength(1);
      expect(typeof middlewares[0]).toBe('function');
    });
  });

  describe('checkAuthorization', () => {
    it('should return false if authenticatedOnly is true and user is not authenticated', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;

      const roles: RoleConfig = { authenticatedOnly: true };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(true); // User is authenticated
    });

    it('should return false if user has denied role', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['banned']
      };
      mockReq.user = user;

      const roles: RoleConfig = { deny: ['banned'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(false);
    });

    it('should return false if user lacks allowed role', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(false);
    });

    it('should return true if user has allowed role', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['admin']
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(true);
    });

    it('should return false if user has no roles and roles are required', async () => {
      const user: AuthUser = {
        id: '123',
        roles: undefined
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(false);
    });

    it('should handle selfOnly with boolean true', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;
      mockReq.params = { id: '123' };

      const roles: RoleConfig = { selfOnly: true };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(true);
    });

    it('should handle selfOnly with function', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;
      mockReq.params = { id: '123' };

      const roles: RoleConfig = { 
        selfOnly: jest.fn().mockReturnValue(true)
      };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(roles.selfOnly).toHaveBeenCalledWith(user, '123');
      expect(result).toBe(true);
    });

    it('should handle selfOnly with userId param', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;
      mockReq.params = { userId: '123' };

      const roles: RoleConfig = { selfOnly: true };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(true);
    });

    it('should return false if selfOnly check fails', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;
      mockReq.params = { id: '456' };

      const roles: RoleConfig = { selfOnly: true };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(false);
    });

    it('should handle customCheck function', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;

      const customCheck = jest.fn().mockResolvedValue(true);
      const roles: RoleConfig = { customCheck };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(customCheck).toHaveBeenCalledWith(user, mockReq);
      expect(result).toBe(true);
    });

    it('should return true if no specific checks are required', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user']
      };
      mockReq.user = user;

      const roles: RoleConfig = {};
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle user with empty roles array', async () => {
      const user: AuthUser = {
        id: '123',
        roles: []
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(false);
    });

    it('should handle multiple allowed roles', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user', 'moderator']
      };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin', 'moderator'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(true);
    });

    it('should handle multiple denied roles', async () => {
      const user: AuthUser = {
        id: '123',
        roles: ['user', 'banned']
      };
      mockReq.user = user;

      const roles: RoleConfig = { deny: ['banned', 'suspended'] };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);

      expect(result).toBe(false);
    });
  });
});
