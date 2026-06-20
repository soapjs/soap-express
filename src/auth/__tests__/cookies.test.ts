import { Request, Response } from 'express';
import {
  clearAuthCookies,
  readTokenCookie,
  setAccessTokenCookie,
  setAuthCookies,
  setRefreshTokenCookie,
} from '../cookies';

describe('auth cookie helpers', () => {
  let res: Response;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;
  });

  it('sets access and refresh cookies with secure defaults', () => {
    setAccessTokenCookie(res, 'access-token');
    setRefreshTokenCookie(res, 'refresh-token');

    expect(res.cookie).toHaveBeenNthCalledWith(1, 'access_token', 'access-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: undefined,
      path: '/',
      domain: undefined,
    });
    expect(res.cookie).toHaveBeenNthCalledWith(2, 'refresh_token', 'refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: undefined,
      path: '/',
      domain: undefined,
    });
  });

  it('uses secure cookies in production', () => {
    process.env.NODE_ENV = 'production';

    setAccessTokenCookie(res, 'access-token');

    expect(res.cookie).toHaveBeenCalledWith('access_token', 'access-token', expect.objectContaining({
      secure: true,
    }));
  });

  it('sets and clears auth cookie pairs', () => {
    setAuthCookies(res, { accessToken: 'access-token', refreshToken: 'refresh-token' }, {
      access: { name: 'a' },
      refresh: { name: 'r' },
    });
    clearAuthCookies(res, {
      access: { name: 'a' },
      refresh: { name: 'r' },
    });

    expect(res.cookie).toHaveBeenCalledWith('a', 'access-token', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('r', 'refresh-token', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('a', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('r', expect.any(Object));
  });

  it('reads parsed token cookies', () => {
    const req = { cookies: { access_token: 'access-token' } } as unknown as Request;

    expect(readTokenCookie(req, 'access_token')).toBe('access-token');
  });
});
