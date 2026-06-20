import { Request, Response, NextFunction } from 'express';
import { AuthStrategy } from '@soapjs/soap/http';
import { authMiddleware, requirePermissions, requireRoles } from '../middleware';

describe('auth middleware helpers', () => {
  function createResponse(): Response {
    return {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    } as any;
  }

  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      body: {},
      params: {},
    } as Request;
    res = createResponse();
    next = jest.fn();
  });

  it('authenticates through a SoapAuth-compatible provider and attaches result', async () => {
    const strategy: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockResolvedValue({
        user: { id: 'user-1', roles: ['admin'], permissions: ['users:read'] },
        tokens: { accessToken: 'access-token' },
      }),
    };
    const provider = {
      getStrategy: jest.fn().mockReturnValue(strategy),
    };

    await authMiddleware(provider, 'jwt')(req, res, next);

    expect(provider.getStrategy).toHaveBeenCalledWith('jwt', 'http');
    expect(strategy.authenticate).toHaveBeenCalledWith(expect.objectContaining({ req, res }));
    expect((req as any).user).toEqual({ id: 'user-1', roles: ['admin'], permissions: ['users:read'] });
    expect((req as any).auth.tokens).toEqual({ accessToken: 'access-token' });
    expect(res.locals.auth).toEqual(expect.objectContaining({ user: expect.objectContaining({ id: 'user-1' }) }));
    expect(next).toHaveBeenCalled();
  });

  it('allows anonymous requests when required=false', async () => {
    const strategy: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockResolvedValue(null),
    };

    await authMiddleware(strategy, 'jwt', { required: false })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns a stable 401 when authentication is required', async () => {
    const strategy: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockResolvedValue(null),
    };

    await authMiddleware(strategy, 'jwt')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'MissingAuthenticatedUserError',
      message: 'User is not authenticated',
      statusCode: 401,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('supports custom error response shaping', async () => {
    class InvalidTokenError extends Error {}
    const strategy: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockRejectedValue(new InvalidTokenError('bad token')),
    };

    await authMiddleware(strategy, 'jwt', {
      errorResponse: error => ({ code: error.name, message: error.message }),
    })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'InvalidTokenError', message: 'bad token' });
  });

  it('supports custom success response shaping', async () => {
    const strategy: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockResolvedValue({
        user: { id: 'user-1' },
        tokens: { accessToken: 'access-token' },
      }),
    };

    await authMiddleware(strategy, 'jwt', {
      successResponse: result => ({ id: result?.user.id, accessToken: result?.tokens?.accessToken }),
    })(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ id: 'user-1', accessToken: 'access-token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('guards roles and permissions', () => {
    (req as any).user = {
      id: 'user-1',
      roles: ['admin'],
      permissions: ['users:read', 'users:write'],
    };

    requireRoles('admin')(req, res, next);
    requirePermissions('users:read', 'users:write')(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('rejects missing roles and permissions with 403', () => {
    (req as any).user = {
      id: 'user-1',
      roles: ['user'],
      permissions: ['users:read'],
    };

    requireRoles('admin')(req, res, next);
    requirePermissions('users:write')(req, res, next);

    expect(res.status).toHaveBeenNthCalledWith(1, 403);
    expect(res.status).toHaveBeenNthCalledWith(2, 403);
    expect(next).not.toHaveBeenCalled();
  });
});
