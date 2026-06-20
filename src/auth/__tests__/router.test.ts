import express from 'express';
import request from 'supertest';
import { AuthStrategy } from '@soapjs/soap/http';
import { createAuthRouter } from '../router';

describe('createAuthRouter', () => {
  function appWith(strategy: AuthStrategy, options: any = {}) {
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(strategy, options));
    return app;
  }

  it('mounts login, me, refresh, logout and revoke routes', async () => {
    const user = { id: 'user-1', roles: ['admin'] };
    const strategy: AuthStrategy & any = {
      name: 'jwt',
      authenticate: jest.fn().mockResolvedValue({
        user,
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
      }),
      refresh: jest.fn().mockResolvedValue({
        user,
        tokens: { accessToken: 'new-access-token' },
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      revokeToken: jest.fn().mockResolvedValue(undefined),
    };

    const app = appWith(strategy);

    const login = await request(app).post('/auth/login').send({ email: 'a@b.test' });
    expect(login.status).toBe(200);
    expect(login.body.user).toEqual(user);
    expect(login.headers['set-cookie']).toEqual(expect.arrayContaining([
      expect.stringContaining('access_token=access-token'),
      expect.stringContaining('refresh_token=refresh-token'),
    ]));

    const me = await request(app).get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual(user);

    const refresh = await request(app).post('/auth/refresh');
    expect(refresh.status).toBe(200);
    expect(refresh.body.tokens.accessToken).toBe('new-access-token');

    const logout = await request(app).post('/auth/logout');
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });

    const revoke = await request(app)
      .post('/auth/revoke')
      .set('Authorization', 'Bearer access-token');
    expect(revoke.status).toBe(200);
    expect(strategy.revokeToken).toHaveBeenCalledWith('access-token');
  });

  it('supports custom paths and response shape', async () => {
    const strategy: AuthStrategy = {
      name: 'local',
      authenticate: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
    };
    const app = appWith(strategy, {
      routes: {
        login: { path: '/sign-in' },
        me: { enabled: false },
      },
      cookies: false,
      successResponse: (result: any) => ({ id: result?.user?.id }),
    });

    const response = await request(app).post('/auth/sign-in');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'user-1' });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(await request(app).get('/auth/me')).toHaveProperty('status', 404);
  });

  it('maps auth errors through the shared response mapper', async () => {
    class MissingTokenError extends Error {}
    const strategy: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockRejectedValue(new MissingTokenError('token required')),
    };

    const response = await request(appWith(strategy)).get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'MissingTokenError',
      message: 'token required',
      statusCode: 401,
    });
  });

  it('uses provider strategy names for OAuth routes', async () => {
    const githubStrategy: AuthStrategy = {
      name: 'github',
      authenticate: jest.fn().mockResolvedValue({ user: { id: 'github-user' } }),
    };
    const provider = {
      getStrategy: jest.fn().mockReturnValue(githubStrategy),
    };
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(provider));

    const callback = await request(app).get('/auth/oauth/github/callback');

    expect(callback.status).toBe(200);
    expect(callback.body.user).toEqual({ id: 'github-user' });
    expect(provider.getStrategy).toHaveBeenCalledWith('github', 'http');
  });

  it('runs OAuth start/callback inside request-scoped storage context', async () => {
    const strategy: AuthStrategy & any = {
      name: 'github',
      login: jest.fn(async (context: any) => {
        await context.setCookie('oauth2_state', 'state-1');
        context.redirect('/provider/auth?state=state-1');
      }),
      authenticate: jest.fn(async (context: any) => {
        if (context.getCookie('oauth2_state') !== 'state-1') {
          class InvalidStateError extends Error {}
          throw new InvalidStateError('Invalid OAuth2 state');
        }
        return { user: { id: 'github-user' } };
      }),
    };
    const provider = {
      getStrategy: jest.fn().mockReturnValue(strategy),
    };
    const app = express();
    app.use('/auth', createAuthRouter(provider));

    const start = await request(app).get('/auth/oauth/github');
    expect(start.status).toBe(302);
    expect(start.headers.location).toBe('/provider/auth?state=state-1');
    expect(start.headers['set-cookie']).toEqual(expect.arrayContaining([
      expect.stringContaining('oauth2_state=state-1'),
    ]));

    const callback = await request(app)
      .get('/auth/oauth/github/callback?code=abc&state=state-1')
      .set('Cookie', 'oauth2_state=state-1');

    expect(callback.status).toBe(200);
    expect(callback.body.user).toEqual({ id: 'github-user' });
  });

  it('maps OAuth callback failures through the auth error mapper', async () => {
    class InvalidStateError extends Error {}
    const strategy: AuthStrategy = {
      name: 'github',
      authenticate: jest.fn().mockRejectedValue(new InvalidStateError('Invalid OAuth2 state')),
    };
    const provider = {
      getStrategy: jest.fn().mockReturnValue(strategy),
    };
    const app = express();
    app.use('/auth', createAuthRouter(provider));

    const response = await request(app).get('/auth/oauth/github/callback?code=abc&state=bad');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'InvalidStateError',
      message: 'Invalid OAuth2 state',
      statusCode: 400,
    });
  });

  it('maps OAuth token exchange and profile mapping failures', async () => {
    class TokenExchangeError extends Error {}
    class ProfileMappingError extends Error {}
    const strategy: AuthStrategy = {
      name: 'github',
      authenticate: jest.fn()
        .mockRejectedValueOnce(new TokenExchangeError('Token exchange failed'))
        .mockRejectedValueOnce(new ProfileMappingError('Profile mapping failed')),
    };
    const provider = {
      getStrategy: jest.fn().mockReturnValue(strategy),
    };
    const app = express();
    app.use('/auth', createAuthRouter(provider));

    const tokenExchange = await request(app).get('/auth/oauth/github/callback?code=bad');
    const profileMapping = await request(app).get('/auth/oauth/github/callback?code=bad-profile');

    expect(tokenExchange.status).toBe(500);
    expect(tokenExchange.body).toEqual({
      error: 'TokenExchangeError',
      message: 'Token exchange failed',
      statusCode: 500,
    });
    expect(profileMapping.status).toBe(500);
    expect(profileMapping.body).toEqual({
      error: 'ProfileMappingError',
      message: 'Profile mapping failed',
      statusCode: 500,
    });
  });

  it('mounts hybrid link and unlink routes', async () => {
    const strategy: AuthStrategy & any = {
      name: 'github',
      linkAccount: jest.fn().mockResolvedValue({ user: { id: 'user-1', linked: ['github'] } }),
      unlinkAccount: jest.fn().mockResolvedValue({ user: { id: 'user-1', linked: [] } }),
      authenticate: jest.fn(),
    };
    const provider = {
      getStrategy: jest.fn().mockReturnValue(strategy),
    };
    const app = express();
    app.use('/auth', createAuthRouter(provider));

    const link = await request(app).post('/auth/oauth/github/link');
    const unlink = await request(app).delete('/auth/oauth/github/link');

    expect(link.status).toBe(200);
    expect(link.body.user).toEqual({ id: 'user-1', linked: ['github'] });
    expect(unlink.status).toBe(200);
    expect(unlink.body.user).toEqual({ id: 'user-1', linked: [] });
    expect(strategy.linkAccount).toHaveBeenCalled();
    expect(strategy.unlinkAccount).toHaveBeenCalled();
  });

  it('returns 405 when a strategy does not support hybrid link/unlink', async () => {
    const strategy: AuthStrategy = {
      name: 'github',
      authenticate: jest.fn(),
    };
    const app = appWith(strategy);

    const link = await request(app).post('/auth/oauth/github/link');
    const unlink = await request(app).delete('/auth/oauth/github/link');

    expect(link.status).toBe(405);
    expect(link.body).toEqual({
      error: 'HybridLinkNotSupported',
      message: 'Strategy does not support HybridLink',
      statusCode: 405,
    });
    expect(unlink.status).toBe(405);
    expect(unlink.body).toEqual({
      error: 'HybridUnlinkNotSupported',
      message: 'Strategy does not support HybridUnlink',
      statusCode: 405,
    });
  });
});
