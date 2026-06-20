import { Router, Request, Response, NextFunction } from 'express';
import type { AuthResult, AuthStrategy } from '@soapjs/soap/http';
import { createExpressAuthContext } from './context';
import { AuthProvider, authMiddleware } from './middleware';
import { AuthResponseOptions, sendAuthError } from './errors';
import { AuthCookiesOptions, clearAuthCookies, setAuthCookies } from './cookies';
import { runWithExpressAuthContext } from './oauth2-storage';

export interface AuthRouterRouteOptions {
  path?: string;
  strategy?: string;
  enabled?: boolean;
}

export interface AuthRouterOptions extends AuthResponseOptions<AuthResult | null> {
  category?: string;
  strategy?: string;
  basePath?: string;
  cookies?: false | AuthCookiesOptions;
  routes?: {
    login?: AuthRouterRouteOptions;
    logout?: AuthRouterRouteOptions;
    refresh?: AuthRouterRouteOptions;
    me?: AuthRouterRouteOptions;
    verify?: AuthRouterRouteOptions;
    revoke?: AuthRouterRouteOptions;
    oauthStart?: AuthRouterRouteOptions;
    oauthCallback?: AuthRouterRouteOptions;
    hybridLink?: AuthRouterRouteOptions;
    hybridUnlink?: AuthRouterRouteOptions;
  };
  redirectUrl?: string | ((result: AuthResult, req: Request) => string);
}

function pathFor(route: AuthRouterRouteOptions | undefined, fallback: string): string {
  return route?.path || fallback;
}

function isEnabled(route: AuthRouterRouteOptions | undefined): boolean {
  return route?.enabled !== false;
}

function resolveStrategy(
  auth: AuthProvider | AuthStrategy,
  name: string,
  category: string,
): AuthStrategy {
  if (typeof (auth as AuthProvider).getStrategy === 'function') {
    return (auth as AuthProvider).getStrategy(name, category);
  }
  if (category === 'http' && typeof (auth as AuthProvider).getHttpStrategy === 'function') {
    return (auth as AuthProvider).getHttpStrategy!(name);
  }
  return auth as AuthStrategy;
}

function successBody(result: AuthResult | null, req: Request, options: AuthRouterOptions): unknown {
  if (options.successResponse) {
    return options.successResponse(result, req);
  }
  return result ?? { ok: true };
}

function attachCookies(res: Response, result: AuthResult | null, options: AuthRouterOptions): void {
  if (options.cookies === false || !result?.tokens) return;
  setAuthCookies(res, result.tokens, options.cookies);
}

function sendSuccess(req: Request, res: Response, result: AuthResult | null, options: AuthRouterOptions): void {
  if (result) {
    (req as any).user = result.user;
    (req as any).auth = {
      ...((req as any).auth || {}),
      result,
      tokens: result.tokens,
      session: result.session,
    };
    res.locals.auth = result;
    attachCookies(res, result, options);
  }

  if (result && options.redirectUrl) {
    const url = typeof options.redirectUrl === 'function'
      ? options.redirectUrl(result, req)
      : options.redirectUrl;
    res.redirect(url);
    return;
  }

  res.json(successBody(result, req, options));
}

async function callRefresh(strategy: any, context: any): Promise<AuthResult | null> {
  if (typeof strategy.refresh === 'function') {
    return strategy.refresh(context);
  }
  if (typeof strategy.refreshTokens === 'function') {
    return strategy.refreshTokens(context);
  }
  if (typeof strategy.refreshAccessToken === 'function') {
    const tokens = await strategy.refreshAccessToken(context);
    return { user: (context.req as any).user, tokens } as AuthResult;
  }
  return null;
}

async function callRevoke(strategy: any, context: any): Promise<void> {
  const token = context.getFromHeader?.()
    || context.getFromCookie?.('access_token')
    || context.body?.token;
  if (typeof strategy.revokeToken === 'function' && token) {
    await strategy.revokeToken(token);
  }
}

async function callHybridLink(strategy: any, context: any): Promise<AuthResult | null | undefined> {
  if (typeof strategy.link === 'function') {
    return strategy.link(context);
  }
  if (typeof strategy.linkAccount === 'function') {
    return strategy.linkAccount(context);
  }
  return undefined;
}

async function callHybridUnlink(strategy: any, context: any): Promise<AuthResult | null | undefined> {
  if (typeof strategy.unlink === 'function') {
    return strategy.unlink(context);
  }
  if (typeof strategy.unlinkAccount === 'function') {
    return strategy.unlinkAccount(context);
  }
  return undefined;
}

function sendUnsupported(res: Response, feature: string): void {
  res.status(405).json({
    error: `${feature}NotSupported`,
    message: `Strategy does not support ${feature}`,
    statusCode: 405,
  });
}

export function createAuthRouter(
  auth: AuthProvider | AuthStrategy,
  options: AuthRouterOptions = {},
): Router {
  const router = Router();
  const category = options.category || 'http';
  const defaultStrategy = options.strategy || (auth as AuthStrategy).name || 'default';

  const routeStrategy = (route?: AuthRouterRouteOptions) => {
    return resolveStrategy(auth, route?.strategy || defaultStrategy, category);
  };

  if (isEnabled(options.routes?.login)) {
    router.post(pathFor(options.routes?.login, '/login'), async (req: Request, res: Response) => {
      try {
        const strategy: any = routeStrategy(options.routes?.login);
        const context = createExpressAuthContext(req, res);
        if (typeof strategy.login === 'function') {
          const result = await strategy.login(context);
          if (res.headersSent) return;
          sendSuccess(req, res, result ?? null, options);
          return;
        }
        const result = await strategy.authenticate(context as any);
        sendSuccess(req, res, result, options);
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.logout)) {
    router.post(pathFor(options.routes?.logout, '/logout'), async (req: Request, res: Response) => {
      try {
        const strategy = routeStrategy(options.routes?.logout);
        const context = createExpressAuthContext(req, res);
        if (strategy.logout) {
          await strategy.logout(context as any);
        }
        if (options.cookies !== false) {
          clearAuthCookies(res, options.cookies);
        }
        res.json(options.successResponse ? options.successResponse(null, req) : { ok: true });
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.refresh)) {
    router.post(pathFor(options.routes?.refresh, '/refresh'), async (req: Request, res: Response) => {
      try {
        const strategy = routeStrategy(options.routes?.refresh);
        const context = createExpressAuthContext(req, res);
        const result = await callRefresh(strategy, context);
        if (!result) {
          sendUnsupported(res, 'Refresh');
          return;
        }
        sendSuccess(req, res, result, options);
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.me)) {
    router.get(
      pathFor(options.routes?.me, '/me'),
      authMiddleware(auth, options.routes?.me?.strategy || defaultStrategy, {
        category: category as any,
        errorResponse: options.errorResponse,
      }),
      (req: Request, res: Response) => {
        res.json(options.successResponse
          ? options.successResponse(res.locals.auth ?? null, req)
          : { user: (req as any).user });
      },
    );
  }

  if (isEnabled(options.routes?.verify)) {
    router.post(
      pathFor(options.routes?.verify, '/verify'),
      authMiddleware(auth, options.routes?.verify?.strategy || defaultStrategy, {
        category: category as any,
        errorResponse: options.errorResponse,
      }),
      (req: Request, res: Response) => {
        res.json(options.successResponse
          ? options.successResponse(res.locals.auth ?? null, req)
          : { ok: true, user: (req as any).user });
      },
    );
  }

  if (isEnabled(options.routes?.revoke)) {
    router.post(pathFor(options.routes?.revoke, '/revoke'), async (req: Request, res: Response) => {
      try {
        const strategy = routeStrategy(options.routes?.revoke);
        const context = createExpressAuthContext(req, res);
        await callRevoke(strategy, context);
        res.json(options.successResponse ? options.successResponse(null, req) : { ok: true });
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.oauthStart)) {
    router.get(pathFor(options.routes?.oauthStart, '/oauth/:provider'), async (req: Request, res: Response) => {
      try {
        const strategy: any = routeStrategy({
          strategy: req.params.provider || options.routes?.oauthStart?.strategy,
        });
        const context = createExpressAuthContext(req, res);
        if (typeof strategy.login === 'function') {
          await runWithExpressAuthContext(context, () => strategy.login(context));
          return;
        }
        await runWithExpressAuthContext(context, () => strategy.authenticate(context as any));
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.oauthCallback)) {
    router.get(pathFor(options.routes?.oauthCallback, '/oauth/:provider/callback'), async (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const strategy = routeStrategy({
          strategy: req.params.provider || options.routes?.oauthCallback?.strategy,
        });
        const context = createExpressAuthContext(req, res, next);
        const result = await runWithExpressAuthContext(context, () => strategy.authenticate(context as any));
        sendSuccess(req, res, result, options);
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.hybridLink)) {
    router.post(pathFor(options.routes?.hybridLink, '/oauth/:provider/link'), async (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const strategy = routeStrategy({
          strategy: req.params.provider || options.routes?.hybridLink?.strategy,
        });
        const context = createExpressAuthContext(req, res, next);
        const result = await runWithExpressAuthContext(context, () => callHybridLink(strategy, context));
        if (result === undefined) {
          sendUnsupported(res, 'HybridLink');
          return;
        }
        sendSuccess(req, res, result ?? null, options);
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  if (isEnabled(options.routes?.hybridUnlink)) {
    router.delete(pathFor(options.routes?.hybridUnlink, '/oauth/:provider/link'), async (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const strategy = routeStrategy({
          strategy: req.params.provider || options.routes?.hybridUnlink?.strategy,
        });
        const context = createExpressAuthContext(req, res, next);
        const result = await runWithExpressAuthContext(context, () => callHybridUnlink(strategy, context));
        if (result === undefined) {
          sendUnsupported(res, 'HybridUnlink');
          return;
        }
        sendSuccess(req, res, result ?? null, options);
      } catch (error: any) {
        sendAuthError(error, req, res, options);
      }
    });
  }

  return router;
}
