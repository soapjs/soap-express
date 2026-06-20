import {
  createExpressApiKeyAuth,
  createExpressBasicAuth,
  createExpressHybridOAuth2Auth,
  createExpressJwtAuth,
  createExpressLocalAuth,
  createExpressOAuth2Auth,
} from '../recipes';

jest.mock('@soapjs/soap-auth/recipes', () => ({
  createJwtAuthConfig: jest.fn(options => ({ type: 'jwt', options })),
  createLocalAuthConfig: jest.fn(options => ({ type: 'local', options })),
  createBasicAuthConfig: jest.fn(options => ({ type: 'basic', options })),
  createApiKeyAuthConfig: jest.fn(options => ({ type: 'apiKey', options })),
  createOAuth2ProviderConfig: jest.fn(options => ({ type: 'oauth2', options })),
  createHybridOAuth2ProviderConfig: jest.fn(options => ({ type: 'hybridOAuth2', options })),
}));

describe('express auth recipes', () => {
  it('delegates to soap-auth recipe builders lazily', () => {
    expect(createExpressJwtAuth({ accessSecret: 'secret' } as any)).toEqual({
      type: 'jwt',
      options: { accessSecret: 'secret' },
    });
    expect(createExpressLocalAuth({ basePath: '/auth' } as any)).toEqual({
      type: 'local',
      options: { basePath: '/auth' },
    });
    expect(createExpressBasicAuth({ basePath: '/basic' } as any)).toEqual({
      type: 'basic',
      options: { basePath: '/basic' },
    });
    expect(createExpressApiKeyAuth({ keyType: 'long-term' } as any)).toEqual({
      type: 'apiKey',
      options: { keyType: 'long-term' },
    });
    expect(createExpressOAuth2Auth({ provider: 'auth0' } as any)).toEqual({
      type: 'oauth2',
      options: { provider: 'auth0' },
    });
    expect(createExpressHybridOAuth2Auth({ provider: 'github' } as any)).toEqual({
      type: 'hybridOAuth2',
      options: { provider: 'github' },
    });
  });

  it('injects Express OAuth2 cookie storage into OAuth recipes', () => {
    const config = createExpressOAuth2Auth({
      provider: 'github',
      express: { oauth2: { storage: true } },
    } as any) as any;

    expect(config.type).toBe('oauth2');
    expect(config.options.express).toBeUndefined();
    expect(config.options.state.persistence).toBeDefined();
    expect(config.options.nonce.persistence).toBeDefined();
    expect(config.options.pkce.verifier.embed).toBeDefined();
    expect(config.options.pkce.challenge.embed).toBeDefined();
  });
});
