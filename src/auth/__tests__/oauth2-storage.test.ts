import { Request, Response } from 'express';
import { createExpressAuthContext } from '../context';
import { createCookieOAuth2Storage, runWithExpressAuthContext } from '../oauth2-storage';

describe('OAuth2 Express storage', () => {
  function response(): Response {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      setHeader: jest.fn(),
    } as any;
  }

  it('stores and reads state/nonce through request-scoped cookies', async () => {
    const req = {
      headers: {},
      cookies: { oauth2_state: 'state-1', oauth2_nonce: 'nonce-1' },
    } as unknown as Request;
    const res = response();
    const context = createExpressAuthContext(req, res);
    const storage = createCookieOAuth2Storage();

    await storage.state.persistence.store('state-2', context);
    await storage.nonce.persistence.store('nonce-2', context);

    expect(await storage.state.persistence.read(context)).toBe('state-1');
    expect(await storage.nonce.persistence.read(context)).toBe('nonce-1');

    await storage.state.persistence.remove(context);

    expect((res as any).cookie).toHaveBeenCalledWith('oauth2_state', 'state-2', expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
    }));
    expect((res as any).cookie).toHaveBeenCalledWith('oauth2_nonce', 'nonce-2', expect.any(Object));
    expect((res as any).clearCookie).toHaveBeenCalledWith('oauth2_state', expect.any(Object));
  });

  it('embeds PKCE verifier/challenge in cookies and validates expiration metadata', async () => {
    const req = { headers: {}, cookies: {} } as unknown as Request;
    const res = response();
    const context = createExpressAuthContext(req, res);
    const storage = createCookieOAuth2Storage({ pkceExpiresIn: 60 });

    storage.pkce.verifier.embed(context, 'verifier-1');
    storage.pkce.challenge.embed(context, 'challenge-1');

    await storage.pkce.verifier.persistence.store('verifier-1', context, { expiration: Date.now() + 1000 });
    await storage.pkce.challenge.persistence.store('challenge-1', context, { expiration: Date.now() - 1000 });

    expect(await storage.pkce.verifier.persistence.read(context, 'verifier-1')).toEqual(expect.objectContaining({
      expiration: expect.any(Number),
    }));
    expect(await storage.pkce.challenge.persistence.read(context, 'challenge-1')).toBeNull();
    expect((res as any).cookie).toHaveBeenCalledWith('oauth2_code_verifier', 'verifier-1', expect.any(Object));
    expect((res as any).cookie).toHaveBeenCalledWith('oauth2_code_challenge', 'challenge-1', expect.any(Object));
  });

  it('throws clearly when storage is used outside an Express auth context', async () => {
    const storage = createCookieOAuth2Storage();

    await expect(storage.state.persistence.store('state-1')).rejects.toThrow(
      'OAuth2 Express auth context is not available',
    );
  });

  it('keeps runWithExpressAuthContext as a compatibility wrapper', async () => {
    const req = { headers: {}, cookies: {} } as unknown as Request;
    const res = response();
    const context = createExpressAuthContext(req, res);
    const result = await runWithExpressAuthContext(context, async () => 'ok');

    expect(result).toBe('ok');
  });
});
