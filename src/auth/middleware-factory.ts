import { Request, Response, NextFunction } from 'express';
import { AuthStrategy, AuthUser, RoleConfig, AuthRequest, HttpContext } from '@soapjs/soap/http';
import { AuthRegistry } from './registry';
import { createExpressAuthContext } from './context';
import {
  MissingAuthenticatedUserError,
  MissingRequiredRoleError,
  sendAuthError,
} from './errors';

export interface AuthMiddlewareOptions {
  required?: boolean;
}

export class AuthMiddlewareFactory {
  constructor(private registry: AuthRegistry) {}

  /**
   * Exposes the underlying {@link AuthRegistry} so callers (e.g. the route
   * builder) can pick a sensible default strategy when none was specified
   * on the route metadata.
   */
  getRegistry(): AuthRegistry {
    return this.registry;
  }

  createAuthMiddleware(strategyName: string, options: AuthMiddlewareOptions = {}) {
    const required = options.required !== false;
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const strategy = this.registry.get(strategyName);
      if (!strategy) {
        res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
        return;
      }
      try {
        const ctx = createExpressAuthContext(req as unknown as Request, res, next) as unknown as HttpContext;
        const result = await strategy.authenticate(ctx);
        if (result) {
          res.locals = res.locals || {};
          req.user = result.user;
          (req as any).auth = {
            ...(req.auth || {}),
            result,
            tokens: result.tokens,
            session: result.session,
          };
          res.locals.auth = result;
          next();
        } else if (!required) {
          next();
        } else {
          sendAuthError(new MissingAuthenticatedUserError(), req as unknown as Request, res);
        }
      } catch (error: any) {
        sendAuthError(error, req as unknown as Request, res);
      }
    };
  }

  createLogoutMiddleware(strategyName: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const strategy = this.registry.get(strategyName);
      if (!strategy) {
        res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
        return;
      }
      try {
        const ctx = createExpressAuthContext(req as unknown as Request, res, next) as unknown as HttpContext;
        if (strategy.logout) {
          await strategy.logout(ctx);
        }
        next();
      } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
      }
    };
  }

  createRefreshMiddleware(strategyName: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const strategy = this.registry.get(strategyName);
      if (!strategy) {
        res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
        return;
      }
      try {
        const ctx = createExpressAuthContext(req as unknown as Request, res, next) as unknown as HttpContext;
        if (strategy.refresh) {
          const result = await strategy.refresh(ctx);
          res.locals = res.locals || {};
          req.user = result.user;
          (req as any).auth = {
            ...(req.auth || {}),
            result,
            tokens: result.tokens,
            session: result.session,
          };
          res.locals.auth = result;
          next();
        } else {
          res.status(405).json({ error: `Strategy '${strategyName}' does not support token refresh` });
        }
      } catch (error) {
        res.status(500).json({ error: 'Token refresh failed' });
      }
    };
  }

  createRoleMiddleware(roles: RoleConfig) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          sendAuthError(new MissingAuthenticatedUserError(), req as unknown as Request, res);
          return;
        }
        const authorized = await this.checkAuthorization(req.user, roles, req);
        if (!authorized) {
          sendAuthError(new MissingRequiredRoleError(), req as unknown as Request, res);
          return;
        }
        next();
      } catch (error) {
        res.status(500).json({ error: 'Authorization failed' });
      }
    };
  }

  createAuthRoleMiddleware(strategyName: string, roles?: RoleConfig, options?: AuthMiddlewareOptions) {
    const middlewares = [this.createAuthMiddleware(strategyName, options)];
    if (roles) {
      middlewares.push(this.createRoleMiddleware(roles));
    }
    return middlewares;
  }

  private async checkAuthorization(user: AuthUser, roles: RoleConfig, req: AuthRequest): Promise<boolean> {
    if (roles.authenticatedOnly && !user) return false;
    // Accept both `user.roles: string[]` (canonical AuthUser shape) and a
    // singular `user.role: string` (common in apps that mirror DB columns).
    const userRoles: string[] = Array.isArray((user as any).roles)
      ? (user as any).roles
      : typeof (user as any).role === 'string'
        ? [(user as any).role]
        : [];
    if (roles.deny && roles.deny.some(role => userRoles.includes(role))) return false;
    if (roles.allow && roles.allow.length > 0) {
      if (userRoles.length === 0 || !roles.allow.some(role => userRoles.includes(role))) return false;
    }
    if (roles.selfOnly) {
      if (typeof roles.selfOnly === 'function') {
        const resourceId = req.params?.id || req.params?.userId;
        return roles.selfOnly(user, resourceId);
      } else {
        const resourceId = req.params?.id || req.params?.userId;
        return user.id.toString() === resourceId;
      }
    }
    if (roles.customCheck) {
      return await roles.customCheck(user, req);
    }
    return true;
  }
}
