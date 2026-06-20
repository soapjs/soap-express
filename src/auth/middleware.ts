import { NextFunction, Request, Response } from 'express';
import type { AuthResult, AuthStrategy, AuthUser } from '@soapjs/soap/http';
import { createExpressAuthContext } from './context';
import {
  AuthResponseOptions,
  MissingAuthenticatedUserError,
  MissingRequiredPermissionError,
  MissingRequiredRoleError,
  sendAuthError,
} from './errors';

export type AuthCategory = 'http' | 'socket' | 'grpc' | 'webhook' | 'edge' | 'isa' | 'event';

export interface AuthProvider {
  getStrategy(name: string, type: string): AuthStrategy;
  getHttpStrategy?(name: string): AuthStrategy;
  listStrategies?(type: string): string[];
}

export interface ExpressAuthMiddlewareOptions extends AuthResponseOptions<AuthResult | null> {
  category?: AuthCategory;
  required?: boolean;
}

function resolveStrategy(auth: AuthProvider | AuthStrategy, strategyName: string, category: string): AuthStrategy {
  if (typeof (auth as AuthProvider).getStrategy === 'function') {
    return (auth as AuthProvider).getStrategy(strategyName, category);
  }
  if (category === 'http' && typeof (auth as AuthProvider).getHttpStrategy === 'function') {
    return (auth as AuthProvider).getHttpStrategy!(strategyName);
  }
  return auth as AuthStrategy;
}

function attachAuthResult(req: Request, res: Response, result: AuthResult): void {
  res.locals = res.locals || {};
  (req as any).user = result.user;
  (req as any).auth = {
    ...((req as any).auth || {}),
    result,
    tokens: result.tokens,
    session: result.session,
  };
  res.locals.auth = result;
}

export function authMiddleware(
  auth: AuthProvider | AuthStrategy,
  strategyName: string,
  options: ExpressAuthMiddlewareOptions = {},
) {
  const { category = 'http', required = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const strategy = resolveStrategy(auth, strategyName, category);
      if (!strategy) {
        throw new Error(`Auth strategy '${strategyName}' not found`);
      }

      const context = createExpressAuthContext(req, res, next);
      const result = await strategy.authenticate(context as any);

      if (result) {
        attachAuthResult(req, res, result);
        if (options.successResponse) {
          res.json(options.successResponse(result, req));
          return;
        }
        next();
        return;
      }

      if (!required) {
        next();
        return;
      }

      sendAuthError(new MissingAuthenticatedUserError(), req, res, options);
    } catch (error: any) {
      sendAuthError(error, req, res, options);
    }
  };
}

function userRoles(user?: AuthUser): string[] {
  if (!user) return [];
  if (Array.isArray((user as any).roles)) return (user as any).roles;
  if (typeof (user as any).role === 'string') return [(user as any).role];
  return [];
}

function userPermissions(user?: AuthUser): string[] {
  if (!user) return [];
  return Array.isArray((user as any).permissions) ? (user as any).permissions : [];
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      sendAuthError(new MissingAuthenticatedUserError(), req, res);
      return;
    }

    const actual = userRoles(user);
    if (!roles.some(role => actual.includes(role))) {
      sendAuthError(new MissingRequiredRoleError(), req, res);
      return;
    }

    next();
  };
}

export function requirePermissions(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      sendAuthError(new MissingAuthenticatedUserError(), req, res);
      return;
    }

    const actual = userPermissions(user);
    if (!permissions.every(permission => actual.includes(permission))) {
      sendAuthError(new MissingRequiredPermissionError(), req, res);
      return;
    }

    next();
  };
}
