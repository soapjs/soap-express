import { Request, Response } from 'express';
import { createExpressAuthContext } from '../context';

describe('createExpressAuthContext', () => {
  function createResponse(): Response {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    } as any;
  }

  it('maps request data into an auth context', () => {
    const req = {
      headers: {
        authorization: 'Bearer token-1',
        'x-api-key': 'key-1',
        cookie: 'sid=session-1; theme=dark',
      },
      query: { q: 'search' },
      body: { email: 'a@b.test' },
      params: { id: '123' },
      ip: '127.0.0.1',
    } as unknown as Request;
    const res = createResponse();

    const context = createExpressAuthContext(req, res);

    expect(context.req).toBe(req);
    expect(context.res).toBe(res);
    expect(context.query).toEqual({ q: 'search' });
    expect(context.body).toEqual({ email: 'a@b.test' });
    expect(context.params).toEqual({ id: '123' });
    expect(context.ip).toBe('127.0.0.1');
    expect(context.getHeader('authorization')).toBe('Bearer token-1');
    expect(context.getHeader('x-api-key')).toBe('key-1');
    expect(context.getCookie('sid')).toBe('session-1');
  });

  it('prefers parsed cookies when cookie parser is installed', () => {
    const req = {
      headers: { cookie: 'sid=header-session' },
      cookies: { sid: 'parsed-session' },
    } as unknown as Request;
    const context = createExpressAuthContext(req, createResponse());

    expect(context.getCookie('sid')).toBe('parsed-session');
  });

  it('writes and clears cookies through Express helpers', () => {
    const req = { headers: {} } as Request;
    const res = createResponse();
    const context = createExpressAuthContext(req, res);

    context.setCookie('access', 'token', { httpOnly: true, sameSite: 'lax' });
    context.clearCookie('access', { path: '/' });

    expect((res as any).cookie).toHaveBeenCalledWith('access', 'token', {
      httpOnly: true,
      secure: undefined,
      sameSite: 'lax',
      maxAge: undefined,
      path: undefined,
      domain: undefined,
    });
    expect((res as any).clearCookie).toHaveBeenCalledWith('access', {
      httpOnly: undefined,
      secure: undefined,
      sameSite: undefined,
      maxAge: undefined,
      path: '/',
      domain: undefined,
    });
  });

  it('redirects and writes JSON responses', () => {
    const res = createResponse();
    const context = createExpressAuthContext({ headers: {} } as Request, res);

    context.redirect('/login', 307);
    context.json({ ok: true }, 201);

    expect(res.redirect).toHaveBeenCalledWith(307, '/login');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('implements storage helpers used by soap-auth', () => {
    const req = {
      headers: { authorization: 'Bearer access-token' },
      body: { refreshToken: 'refresh-token' },
      session: { sid: 'session-token' },
    } as unknown as Request;
    const res = createResponse();
    const context = createExpressAuthContext(req, res);

    expect(context.getFromHeader?.()).toBe('access-token');
    expect(context.getFromBodyField?.('refreshToken')).toBe('refresh-token');
    expect(context.getFromSession?.('sid')).toBe('session-token');

    context.storeInHeader?.('new-token');
    context.storeInCookie?.('cookie-token', { cookieName: 'access', httpOnly: true, secure: false });
    context.storeInSession?.('new-session', 'sid');
    context.removeFromSession?.('sid');

    expect(res.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer new-token');
    expect((res as any).cookie).toHaveBeenCalledWith('access', 'cookie-token', expect.any(Object));
    expect((req as any).session.sid).toBeUndefined();
  });
});
