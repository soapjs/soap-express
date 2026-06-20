import express from 'express';
import request from 'supertest';
import { AuthStrategy } from '@soapjs/soap/http';
import { createAuthRouter, authMiddleware, requirePermissions, requireRoles } from '../index';

describe('auth smoke applications', () => {
  function provider(strategies: Record<string, AuthStrategy & any>) {
    return {
      getStrategy: jest.fn((name: string) => strategies[name]),
      listStrategies: jest.fn(() => Object.keys(strategies)),
    };
  }

  it('smokes a JWT-style app with router and protected route', async () => {
    const jwt: AuthStrategy = {
      name: 'jwt',
      authenticate: jest.fn().mockResolvedValue({
        user: { id: 'jwt-user', roles: ['admin'], permissions: ['dashboard:read'] },
        tokens: { accessToken: 'jwt-access', refreshToken: 'jwt-refresh' },
      }),
      refresh: jest.fn().mockResolvedValue({
        user: { id: 'jwt-user' },
        tokens: { accessToken: 'jwt-access-2' },
      }),
    };
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(jwt));
    app.get('/dashboard', authMiddleware(jwt, 'jwt'), requireRoles('admin'), requirePermissions('dashboard:read'), (_req, res) => {
      res.json({ ok: true });
    });

    expect((await request(app).post('/auth/login')).body.tokens.accessToken).toBe('jwt-access');
    expect((await request(app).post('/auth/refresh')).body.tokens.accessToken).toBe('jwt-access-2');
    expect((await request(app).get('/dashboard')).body).toEqual({ ok: true });
  });

  it('smokes a local auth app with refresh route', async () => {
    const local: AuthStrategy = {
      name: 'local',
      authenticate: jest.fn().mockResolvedValue({
        user: { id: 'local-user', email: 'local@example.com' },
        tokens: { accessToken: 'local-access', refreshToken: 'local-refresh' },
      }),
      refresh: jest.fn().mockResolvedValue({
        user: { id: 'local-user' },
        tokens: { accessToken: 'local-access-2' },
      }),
    };
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(local, {
      routes: { login: { path: '/local/login' } },
      successResponse: result => ({ user: result?.user, tokens: result?.tokens }),
    }));

    const login = await request(app).post('/auth/local/login').send({ email: 'local@example.com', password: 'secret' });
    const refresh = await request(app).post('/auth/refresh');

    expect(login.body.user.email).toBe('local@example.com');
    expect(refresh.body.tokens.accessToken).toBe('local-access-2');
  });

  it('smokes an API key app for machine endpoints', async () => {
    const apiKey: AuthStrategy = {
      name: 'apiKey',
      authenticate: jest.fn(async context => {
        if ((context as any).getHeader('x-api-key') !== 'machine-key') return null;
        return { user: { id: 'machine', permissions: ['jobs:write'] } };
      }),
    };
    const app = express();
    app.post('/jobs', authMiddleware(apiKey, 'apiKey'), requirePermissions('jobs:write'), (_req, res) => {
      res.status(202).json({ accepted: true });
    });

    expect((await request(app).post('/jobs').set('x-api-key', 'machine-key')).status).toBe(202);
    expect((await request(app).post('/jobs')).status).toBe(401);
  });

  it('smokes OAuth2 and hybrid OAuth2 routes without provider SDKs', async () => {
    const oauth2: AuthStrategy & any = {
      name: 'github',
      login: jest.fn((context: any) => context.redirect('/provider/github')),
      authenticate: jest.fn().mockResolvedValue({ user: { id: 'github-user' } }),
    };
    const hybrid: AuthStrategy & any = {
      name: 'github-hybrid',
      login: jest.fn((context: any) => context.redirect('/provider/github-hybrid')),
      authenticate: jest.fn().mockResolvedValue({ user: { id: 'github-user' } }),
      linkAccount: jest.fn().mockResolvedValue({ user: { id: 'github-user', linked: ['github'] } }),
      unlinkAccount: jest.fn().mockResolvedValue({ user: { id: 'github-user', linked: [] } }),
    };
    const auth = provider({ github: oauth2, 'github-hybrid': hybrid });
    const app = express();
    app.use('/auth', createAuthRouter(auth));

    expect((await request(app).get('/auth/oauth/github')).headers.location).toBe('/provider/github');
    expect((await request(app).get('/auth/oauth/github/callback?code=ok')).body.user.id).toBe('github-user');
    expect((await request(app).post('/auth/oauth/github-hybrid/link')).body.user.linked).toEqual(['github']);
    expect((await request(app).delete('/auth/oauth/github-hybrid/link')).body.user.linked).toEqual([]);
  });
});
