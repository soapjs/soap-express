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
      authenticate: jest.fn(),
    } as any;

    mockReq = {
      user: undefined,
      params: { id: '123' },
      headers: {},
      cookies: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      cookie: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createAuthMiddleware', () => {
    it('should create authentication middleware', () => {
      registry.register(mockStrategy);
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

    it('should set req.user and call next() on successful authentication', async () => {
      registry.register(mockStrategy);
      const user: AuthUser = { id: 'user-1', email: 'test@example.com' };
      (mockStrategy.authenticate as jest.Mock).mockResolvedValue({ user });

      const middleware = factory.createAuthMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockStrategy.authenticate).toHaveBeenCalled();
      expect(mockReq.user).toEqual(user);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when strategy returns null and required=true (default)', async () => {
      registry.register(mockStrategy);
      (mockStrategy.authenticate as jest.Mock).mockResolvedValue(null);

      const middleware = factory.createAuthMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when strategy returns null and required=false', async () => {
      registry.register(mockStrategy);
      (mockStrategy.authenticate as jest.Mock).mockResolvedValue(null);

      const middleware = factory.createAuthMiddleware('jwt', { required: false });
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 500 on authentication error', async () => {
      registry.register(mockStrategy);
      (mockStrategy.authenticate as jest.Mock).mockRejectedValue(new Error('Strategy error'));

      const middleware = factory.createAuthMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });
  });

  describe('createLogoutMiddleware', () => {
    it('should call strategy.logout and then next()', async () => {
      const logoutFn = jest.fn().mockResolvedValue(undefined);
      (mockStrategy as any).logout = logoutFn;
      registry.register(mockStrategy);

      const middleware = factory.createLogoutMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(logoutFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() even when strategy has no logout method', async () => {
      registry.register(mockStrategy);
      const middleware = factory.createLogoutMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 500 if strategy not found', async () => {
      const middleware = factory.createLogoutMiddleware('nonexistent');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createRefreshMiddleware', () => {
    it('should call strategy.refresh and set req.user', async () => {
      const user: AuthUser = { id: 'user-1' };
      const refreshFn = jest.fn().mockResolvedValue({ user });
      (mockStrategy as any).refresh = refreshFn;
      registry.register(mockStrategy);

      const middleware = factory.createRefreshMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(refreshFn).toHaveBeenCalled();
      expect(mockReq.user).toEqual(user);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 405 when strategy has no refresh method', async () => {
      registry.register(mockStrategy);
      const middleware = factory.createRefreshMiddleware('jwt');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockNext).not.toHaveBeenCalled();
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
      const user: AuthUser = { id: '123', roles: ['admin'] };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const middleware = factory.createRoleMiddleware(roles);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user lacks required roles', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      mockReq.user = user;

      const roles: RoleConfig = { allow: ['admin'] };
      const middleware = factory.createRoleMiddleware(roles);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on authorization error', async () => {
      const user: AuthUser = { id: '123', roles: ['admin'] };
      mockReq.user = user;

      const roles: RoleConfig = {
        allow: ['admin'],
        customCheck: jest.fn().mockRejectedValue(new Error('Custom check error')),
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
      const roles: RoleConfig = { allow: ['admin'] };
      const middlewares = factory.createAuthRoleMiddleware('jwt', roles);

      expect(middlewares).toHaveLength(2);
      expect(typeof middlewares[0]).toBe('function');
      expect(typeof middlewares[1]).toBe('function');
    });

    it('should create only auth middleware if no roles provided', () => {
      registry.register(mockStrategy);
      const middlewares = factory.createAuthRoleMiddleware('jwt');

      expect(middlewares).toHaveLength(1);
      expect(typeof middlewares[0]).toBe('function');
    });
  });

  describe('checkAuthorization', () => {
    it('should return false if user has denied role', async () => {
      const user: AuthUser = { id: '123', roles: ['banned'] };
      const roles: RoleConfig = { deny: ['banned'] };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(false);
    });

    it('should return false if user lacks allowed role', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      const roles: RoleConfig = { allow: ['admin'] };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(false);
    });

    it('should return true if user has allowed role', async () => {
      const user: AuthUser = { id: '123', roles: ['admin'] };
      const roles: RoleConfig = { allow: ['admin'] };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(true);
    });

    it('should handle selfOnly with boolean true', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      mockReq.params = { id: '123' };
      const roles: RoleConfig = { selfOnly: true };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(true);
    });

    it('should handle selfOnly with function', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      mockReq.params = { id: '123' };
      const selfOnlyFn = jest.fn().mockReturnValue(true);
      const roles: RoleConfig = { selfOnly: selfOnlyFn };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);
      expect(selfOnlyFn).toHaveBeenCalledWith(user, '123');
      expect(result).toBe(true);
    });

    it('should return false if selfOnly check fails', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      mockReq.params = { id: '456' };
      const roles: RoleConfig = { selfOnly: true };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(false);
    });

    it('should handle customCheck function', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      const customCheck = jest.fn().mockResolvedValue(true);
      const roles: RoleConfig = { customCheck };
      const result = await (factory as any).checkAuthorization(user, roles, mockReq);
      expect(customCheck).toHaveBeenCalledWith(user, mockReq);
      expect(result).toBe(true);
    });

    it('should return true if no specific checks are required', async () => {
      const user: AuthUser = { id: '123', roles: ['user'] };
      expect(await (factory as any).checkAuthorization(user, {}, mockReq)).toBe(true);
    });

    it('should handle multiple allowed roles', async () => {
      const user: AuthUser = { id: '123', roles: ['user', 'moderator'] };
      const roles: RoleConfig = { allow: ['admin', 'moderator'] };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(true);
    });

    it('should handle multiple denied roles', async () => {
      const user: AuthUser = { id: '123', roles: ['user', 'banned'] };
      const roles: RoleConfig = { deny: ['banned', 'suspended'] };
      expect(await (factory as any).checkAuthorization(user, roles, mockReq)).toBe(false);
    });
  });
});
