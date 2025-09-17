import { SoapExpressPlugin, EnhancedPluginContext } from '../src/plugins';
import { SoapExpressApp } from '../src/app';
import { SoapAuth, JwtStrategy, LocalStrategy, OAuth2Strategy } from '@soapjs/soap-auth';
import { Request, Response, NextFunction } from 'express';
import { AuthStrategy } from '../src/auth';

export class SoapExpressAuthPlugin implements SoapExpressPlugin {
  readonly name = 'soap-express-auth';
  readonly version = '1.0.0';
  readonly description = 'Authentication plugin for SoapExpress using SoapAuth';
  readonly author = 'SoapJS Team';
  readonly category = 'authentication';
  readonly tags = ['auth', 'jwt', 'oauth', 'security'];
  
  readonly provides = {
    routes: true,
    middlewares: true,
    authStrategies: true,
    services: true
  };

  private soapAuth?: SoapAuth;
  private context?: EnhancedPluginContext;

  constructor(private config: SoapAuthConfig) {}

  install(app: SoapExpressApp, context: EnhancedPluginContext, options?: any): void {
    this.context = context;
    
    // Initialize SoapAuth
    this.soapAuth = new SoapAuth(this.config);
    
    // Register auth strategies
    this.registerAuthStrategies();
    
    // Register auth routes
    this.registerAuthRoutes();
    
    // Register auth services
    this.registerAuthServices();
    
    // Sync strategies with Express
    this.syncAuthStrategies();
  }

  private registerAuthStrategies(): void {
    if (!this.soapAuth) return;

    // JWT Strategy
    if (this.config.jwt) {
      const jwtStrategy = new JwtStrategy({
        secret: this.config.jwt.secret,
        accessToken: {
          expiresIn: this.config.jwt.accessToken?.expiresIn || '1h',
          issuer: this.config.jwt.accessToken?.issuer,
          audience: this.config.jwt.accessToken?.audience
        },
        refreshToken: {
          expiresIn: this.config.jwt.refreshToken?.expiresIn || '7d'
        },
        user: {
          fetchUser: this.config.jwt.fetchUser
        }
      });
      
      this.soapAuth.addStrategy(jwtStrategy, 'jwt', 'http');
    }

    // Local Strategy
    if (this.config.local) {
      const localStrategy = new LocalStrategy({
        extractCredentials: this.config.local.extractCredentials,
        verifyCredentials: this.config.local.verifyCredentials,
        user: {
          fetchUser: this.config.local.fetchUser
        },
        routes: {
          login: { path: '/auth/login', method: 'POST' },
          logout: { path: '/auth/logout', method: 'POST' }
        }
      });
      
      this.soapAuth.addStrategy(localStrategy, 'local', 'http');
    }

    // OAuth2 Strategies
    if (this.config.oauth2) {
      Object.entries(this.config.oauth2).forEach(([provider, config]) => {
        const oauth2Strategy = new OAuth2Strategy({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          endpoints: config.endpoints,
          user: {
            fetchUser: config.fetchUser
          }
        });
        
        this.soapAuth!.addStrategy(oauth2Strategy, provider, 'http');
      });
    }
  }

  private registerAuthRoutes(): void {
    if (!this.context || !this.soapAuth) return;

    const expressApp = this.context.getExpressApp();

    // Login route
    expressApp.post('/auth/login', async (req: Request, res: Response) => {
      try {
        const localStrategy = this.soapAuth!.getHttpStrategy('local');
        const result = await localStrategy.authenticate(req);
        
        if (result) {
          res.json({
            success: true,
            user: result.user,
            tokens: result.tokens
          });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Refresh token route
    expressApp.post('/auth/refresh', async (req: Request, res: Response) => {
      try {
        const jwtStrategy = this.soapAuth!.getHttpStrategy('jwt');
        const refreshToken = req.body.refreshToken;
        
        if (!refreshToken) {
          return res.status(400).json({ error: 'Refresh token required' });
        }

        const newToken = await jwtStrategy.refresh(refreshToken);
        res.json({ accessToken: newToken });
      } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
      }
    });

    // OAuth2 routes
    if (this.config.oauth2) {
      Object.keys(this.config.oauth2).forEach(provider => {
        expressApp.get(`/auth/${provider}`, async (req: Request, res: Response) => {
          try {
            const strategy = this.soapAuth!.getHttpStrategy(provider);
            const authUrl = strategy.getAuthorizationUrl();
            res.redirect(authUrl);
          } catch (error) {
            res.status(500).json({ error: 'OAuth failed' });
          }
        });

        expressApp.get(`/auth/${provider}/callback`, async (req: Request, res: Response) => {
          try {
            const strategy = this.soapAuth!.getHttpStrategy(provider);
            const result = await strategy.authenticate(req);
            
            if (result) {
              res.json({
                success: true,
                user: result.user,
                tokens: result.tokens
              });
            } else {
              res.status(401).json({ error: 'OAuth authentication failed' });
            }
          } catch (error) {
            res.status(500).json({ error: 'OAuth callback failed' });
          }
        });
      });
    }
  }

  private registerAuthServices(): void {
    if (!this.context) return;

    // Register SoapAuth as a service
    this.context.registerService('SoapAuth', () => this.soapAuth);
    
    // Register auth utilities
    this.context.registerService('AuthUtils', () => ({
      extractToken: (req: Request) => {
        const authHeader = req.headers.authorization;
        return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      },
      createAuthResult: (user: any, tokens?: any) => ({
        user,
        tokens,
        success: true
      })
    }));
  }

  private syncAuthStrategies(): void {
    if (!this.context || !this.soapAuth) return;

    const httpStrategies = this.soapAuth.listStrategies('http');
    
    httpStrategies.forEach(strategyName => {
      const soapAuthStrategy = this.soapAuth!.getHttpStrategy(strategyName);
      const expressAdapter = this.createExpressAuthStrategy(soapAuthStrategy, strategyName);
      this.context!.createAuthStrategy(expressAdapter);
    });
  }

  private createExpressAuthStrategy(soapAuthStrategy: any, name: string): AuthStrategy {
    return {
      name,
      configure: () => {},
      middleware: (options?: any) => {
        return async (req: Request, res: Response, next: NextFunction) => {
          try {
            const result = await soapAuthStrategy.authenticate(req);
            
            if (!result) {
              return res.status(401).json({ error: 'Authentication failed' });
            }

            (req as any).user = result.user;
            
            if (result.tokens) {
              (req as any).auth = {
                tokens: result.tokens,
                session: result.session
              };
            }

            next();
          } catch (error) {
            console.error('Auth error:', error);
            res.status(500).json({ error: 'Authentication failed' });
          }
        };
      }
    };
  }

  // Getters for external access
  getSoapAuth(): SoapAuth | undefined {
    return this.soapAuth;
  }

  getStrategy(name: string) {
    return this.soapAuth?.getHttpStrategy(name);
  }
}

// Configuration types
export interface SoapAuthConfig {
  session?: any;
  jwt?: {
    secret: string;
    accessToken?: {
      expiresIn?: string;
      issuer?: string;
      audience?: string;
    };
    refreshToken?: {
      expiresIn?: string;
    };
    fetchUser?: (payload: any) => Promise<any>;
  };
  local?: {
    extractCredentials: (req: any) => { identifier: string; password: string };
    verifyCredentials: (identifier: string, password: string) => Promise<boolean>;
    fetchUser: (credentials: any) => Promise<any>;
  };
  oauth2?: {
    [provider: string]: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      endpoints: {
        authorizationUrl: string;
        tokenUrl: string;
      };
      fetchUser: (profile: any) => Promise<any>;
    };
  };
}

// Factory function
export function createAuthPlugin(config: SoapAuthConfig): SoapExpressAuthPlugin {
  return new SoapExpressAuthPlugin(config);
}
