# @soapjs/soap-express

HTTP-focused Express.js integration for the @soapjs/soap framework 0.14.0+ with modern dependency injection, authentication adapters, CQRS wiring, and advanced routing capabilities.

Version `1.0.0` is the stable Express runtime line for the SoapJS 0.14.0+
package set.

Use `@soapjs/cli` to scaffold new SoapJS applications, resources, controllers,
contracts, auth, storage, events, OpenAPI documentation, and observability setup.
`@soapjs/soap-express` is the HTTP runtime those generated Express apps target.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Controllers & Routes](#controllers--routes)
- [Dependency Injection](#dependency-injection)
- [Authentication & Authorization](#authentication--authorization)
- [CQRS & Domain Events](#cqrs--domain-events)
- [Request/Response Transformation](#requestresponse-transformation)
- [Advanced Routing](#advanced-routing)
- [Middleware System](#middleware-system)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)

## Features

- 🚀 **HTTP-Only Focus**: Clean separation from WebSocket functionality
- 🔧 **Modern DI System**: Full integration with the @soapjs/soap DI container
- 🎯 **Decorator-Based**: Clean, declarative API using decorators
- 🛡️ **Type Safety**: Full TypeScript support
- 🔐 **Authentication**: Built-in auth decorators and middleware factory
- 📨 **CQRS & Events**: `@CommandHandler` / `@QueryHandler` / `@EventHandler` with bus wiring
- 📦 **Middleware Support**: Built-in middleware for validation, CORS, rate limiting, etc.
- 🔄 **RouteIO**: Request/response transformation system
- ⚡ **Express Integration**: Seamless integration with Express.js
- 🎨 **Flexible Architecture**: Use DI with decorators or direct container access
- 🔌 **Plugin System**: Extensible plugin architecture
- 📚 **Auto Documentation**: Automatic API documentation generation

## Installation

```bash
npm install @soapjs/soap-express @soapjs/soap express
```

For new projects, start with the CLI:

```bash
npm install -g @soapjs/cli
soap new my-api
```

Authentication helpers are exposed through an optional subpath and require
`@soapjs/soap-auth`:

```bash
npm install @soapjs/soap-express @soapjs/soap @soapjs/soap-auth express
```

## Quick Start

```typescript
import { SoapExpressApp, Controller, Get } from '@soapjs/soap-express';
import { DI, Injectable, Inject } from '@soapjs/soap/common';

// Service with dependency injection
@Injectable()
class UserService {
  async getUsers() {
    return [{ id: 1, name: 'John Doe' }];
  }
}

// Controller
@Controller('/api/users')
class UserController {
  constructor(@Inject('UserService') private userService: UserService) {}

  @Get('/')
  async getUsers(req: any, res: any) {
    const users = await this.userService.getUsers();
    res.json(users);
  }
}

// App setup with new DI system
const app = new SoapExpressApp();
DI.bind('UserService').toClass(UserService);
app.registerController(UserController);

await app.start(3000);
```

## Core Concepts

### 1. SoapExpressApp

The main application class that wraps Express.js and provides integration with @soapjs/soap.

```typescript
const app = new SoapExpressApp({
  container?: DIContainer,           // DI container (optional, uses global by default)
  errorHandler?: Function,           // Custom error handler
  errorHandlerOptions?: object,      // Error handler options
  middlewares?: any[],              // Global middlewares
  cors?: object,                    // CORS options
  rateLimit?: object,               // Rate limiting options
  logging?: object                  // Logging options
});
```

### 2. Controllers

Controllers are classes that handle HTTP requests. They use decorators to define routes and can inject services.

```typescript
@Controller('/api/users')
class UserController {
  // Route handlers here
}
```

### 3. Services

Services contain business logic and can be injected into controllers.

```typescript
@Injectable()
class UserService {
  // Business logic here
}
```

## Controllers & Routes

### Basic Route Decorators

```typescript
import { Controller, Get, Post, Put, Delete, Patch } from '@soapjs/soap-express';

@Controller('/api/users')
class UserController {
  @Get('/')
  async getUsers(req: Request, res: Response) {
    // Handle GET /api/users
  }

  @Get('/:id')
  async getUser(req: Request, res: Response) {
    // Handle GET /api/users/:id
  }

  @Post('/')
  async createUser(req: Request, res: Response) {
    // Handle POST /api/users
  }

  @Put('/:id')
  async updateUser(req: Request, res: Response) {
    // Handle PUT /api/users/:id
  }

  @Delete('/:id')
  async deleteUser(req: Request, res: Response) {
    // Handle DELETE /api/users/:id
  }
}
```

### Advanced Route Options

Routes can be configured with advanced options:

```typescript
@Get('/', {
  cors: {
    origin: ['http://localhost:3000', 'https://myapp.com'],
    credentials: true
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  cache: {
    ttl: 300 // 5 minutes
  },
  validation: {
    request: {
      schema: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true, format: 'email' }
      }
    }
  }
})
async getUsers(req: Request, res: Response) {
  // Route with advanced options
}
```

## Dependency Injection

The framework integrates with the @soapjs/soap 0.14.0+ DI container, providing modern dependency resolution and injection with the `DI.bind().toClass()` API.

### Using Decorators (Recommended)

```typescript
import { Injectable, Inject } from '@soapjs/soap/common';

@Injectable()
class UserService {
  async getUsers() {
    return [{ id: 1, name: 'John Doe' }];
  }
}

@Injectable()
class EmailService {
  async sendEmail(to: string, subject: string, body: string) {
    // Send email logic
  }
}

@Controller('/api/users')
class UserController {
  constructor(
    @Inject('UserService') private userService: UserService,
    @Inject('EmailService') private emailService: EmailService
  ) {}

  @Post('/')
  async createUser(req: Request, res: Response) {
    const user = await this.userService.createUser(req.body);
    await this.emailService.sendEmail(user.email, 'Welcome!', 'Welcome to our app!');
    res.json(user);
  }
}

// Registration using new DI system
DI.bind('UserService').toClass(UserService);
DI.bind('EmailService').toClass(EmailService);
```

### Using Container Directly

```typescript
import { DI } from '@soapjs/soap/common';

@Controller('/api/users')
class UserController {
  @Get('/')
  async getUsers(req: Request, res: Response) {
    const userService = DI.get('UserService');
    const users = await userService.getUsers();
    res.json(users);
  }
}

// Registration using new DI system
DI.bind('UserService').toClass(UserService);
DI.bind('config').toValue({ apiKey: 'secret' });
DI.bind('logger').toFactory(() => new Logger());
```

### Service Registration Methods

```typescript
// Class registration (new DI system)
DI.bind('UserService').toClass(UserService);

// Value registration
DI.bind('config').toValue({ apiKey: 'secret' });

// Factory registration
DI.bind('logger').toFactory(() => new Logger());

// Interface binding
DI.bind('IUserRepository').toInterface(UserRepository);

// Abstract binding
DI.bind('BaseService').toAbstract(UserService);
```

## Authentication & Authorization

### Auth Decorators

```typescript
import { Auth, AdminOnly, RolesOnly, Public, SelfOnly } from '@soapjs/soap-express';

@Controller('/api/users')
class UserController {
  @Get('/')
  @Public() // No authentication required
  async getUsers(req: Request, res: Response) {
    // Public endpoint
  }

  @Get('/profile')
  @Auth('jwt') // Simple strategy name
  async getProfile(req: Request, res: Response) {
    // Requires JWT authentication
    res.json({ user: req.user });
  }

  @Post('/')
  @Auth({ 
    strategy: 'jwt', 
    roles: { allow: ['admin', 'user'] } 
  })
  async createUser(req: Request, res: Response) {
    // Requires JWT + specific roles
  }

  @Get('/admin')
  @AdminOnly('jwt') // Requires admin role
  async adminOnly(req: Request, res: Response) {
    // Admin only endpoint
  }

  @Get('/:id')
  @SelfOnly('jwt') // Only resource owner can access
  async getUserById(req: Request, res: Response) {
    // User can only access their own data
  }

  @Post('/:id/update')
  @RolesOnly(['admin', 'moderator'], 'jwt') // Multiple roles
  async updateUser(req: Request, res: Response) {
    // Requires specific roles
  }
}
```

### Auth Strategy Registration

```typescript
// Auth strategies come from @soapjs/soap-auth.

// Register ALL HTTP strategies from a SoapAuth-compatible provider in one call.
// Accepts any object exposing listStrategies(type) + getStrategy(name, type),
// so soap-express needs no direct dependency on soap-auth.
app.registerAuth(soapAuth);

// ...or register a single strategy directly:
// app.registerAuthStrategy(new JWTStrategy({
//   secret: process.env.JWT_SECRET || 'your-secret-key',
//   algorithms: ['HS256'],
//   issuer: 'your-app',
//   audience: 'your-users'
// }));

// app.registerAuthStrategy(new LocalStrategy({
//   usernameField: 'email',
//   validateUser: async (email, password) => {
//     const user = await userService.findByEmail(email);
//     if (user && await bcrypt.compare(password, user.password)) {
//       return user;
//     }
//     return null;
//   }
// }));
```

### Express Auth Integration

`@soapjs/soap-express/auth` provides the Express adapter layer for
`@soapjs/soap-auth`: request/response context, middleware, guards, cookies,
router helpers and thin recipe wrappers. Strategy implementation stays in
`@soapjs/soap-auth`.

Public auth exports include:

- `createExpressAuthContext(req, res, next?)`
- `authMiddleware(auth, strategyName, options?)`
- `requireRoles(...roles)`
- `requirePermissions(...permissions)`
- `createAuthRouter(auth, options?)`
- `setAccessTokenCookie`, `setRefreshTokenCookie`, `setAuthCookies`,
  `clearAuthCookies`, `readTokenCookie`
- `createCookieOAuth2Storage`
- recipe wrappers: `createExpressJwtAuth`, `createExpressLocalAuth`,
  `createExpressBasicAuth`, `createExpressApiKeyAuth`,
  `createExpressOAuth2Auth`, `createExpressHybridOAuth2Auth`

```typescript
import express from 'express';
import { SoapAuth } from '@soapjs/soap-auth';
import {
  authMiddleware,
  createAuthRouter,
  createExpressJwtAuth,
  requireRoles,
} from '@soapjs/soap-express/auth';

const auth = new SoapAuth({
  http: {
    jwt: createExpressJwtAuth({
      accessSecret: process.env.JWT_ACCESS_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      user: {
        fetchUser: async payload => userRepository.findById((payload as any).sub),
      },
    }),
  },
});

await auth.init();

const app = express();
app.use(express.json());

// Ready-made login/logout/refresh/me/verify/revoke routes.
app.use('/auth', createAuthRouter(auth, {
  strategy: 'jwt',
  cookies: {
    access: { name: 'access_token' },
    refresh: { name: 'refresh_token' },
  },
}));

// Route-level middleware.
app.get(
  '/admin',
  authMiddleware(auth, 'jwt'),
  requireRoles('admin'),
  (_req, res) => res.json({ ok: true }),
);
```

Default auth errors use a stable JSON shape:

```json
{
  "error": "MissingTokenError",
  "message": "Access token is required",
  "statusCode": 401
}
```

Override it with `errorResponse(error, req)` and successful router responses
with `successResponse(result, req)`.

`createAuthRouter()` exposes these routes by default:

- `POST /login`
- `POST /logout`
- `POST /refresh`
- `GET /me`
- `POST /verify`
- `POST /revoke`
- `GET /oauth/:provider`
- `GET /oauth/:provider/callback`
- `POST /oauth/:provider/link`
- `DELETE /oauth/:provider/link`

Each route can be disabled or moved through `routes.<name>`.

### OAuth2 and Hybrid OAuth2

OAuth2 recipes can opt into Express-managed state, nonce and PKCE storage.
The default helper stores transient values in secure HTTP cookies and keeps
PKCE expiration metadata in memory. `@soapjs/soap-auth@1.0.1` passes the
current HTTP context into OAuth2 persistence methods, so custom storage can use
the request/response directly.

```typescript
import {
  createAuthRouter,
  createCookieOAuth2Storage,
  createExpressOAuth2Auth,
} from '@soapjs/soap-express/auth';

const github = createExpressOAuth2Auth({
  provider: 'github',
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/oauth/github/callback',
  scope: ['read:user', 'user:email'],
  express: {
    oauth2: {
      storage: createCookieOAuth2Storage({
        stateCookie: 'github_oauth_state',
        nonceCookie: 'github_oauth_nonce',
        codeVerifierCookie: 'github_pkce_verifier',
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        },
      }),
    },
  },
});

app.use('/auth', createAuthRouter(auth, {
  strategy: 'github',
  redirectUrl: result => `/dashboard?user=${result.user.id}`,
}));
```

For production multi-instance deployments, replace cookie-only transient
storage with session/cache-backed persistence in `soap-auth` config. Cookies
are fine for local development and simple deployments; shared cache/session
storage is safer when callbacks can land on a different process.

Provider presets are passed through `soap-auth` recipes. No provider SDK is
required:

```typescript
const auth0 = createExpressOAuth2Auth({
  provider: 'auth0',
  presetOptions: { domain: process.env.AUTH0_DOMAIN! },
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  redirectUri: 'https://api.example.com/auth/oauth/auth0/callback',
  express: { oauth2: { storage: true } },
});

const keycloak = createExpressOAuth2Auth({
  provider: 'keycloak',
  presetOptions: {
    baseUrl: process.env.KEYCLOAK_BASE_URL!,
    realm: process.env.KEYCLOAK_REALM!,
  },
  clientId: process.env.KEYCLOAK_CLIENT_ID!,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
  redirectUri: 'https://api.example.com/auth/oauth/keycloak/callback',
  express: { oauth2: { storage: true } },
});

const google = createExpressOAuth2Auth({
  provider: 'google',
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: 'https://api.example.com/auth/oauth/google/callback',
  express: { oauth2: { storage: true } },
});

const facebook = createExpressOAuth2Auth({
  provider: 'facebook',
  presetOptions: { version: 'v20.0' },
  clientId: process.env.FACEBOOK_CLIENT_ID!,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
  redirectUri: 'https://api.example.com/auth/oauth/facebook/callback',
  express: { oauth2: { storage: true } },
});

const discord = createExpressOAuth2Auth({
  provider: 'discord',
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  redirectUri: 'https://api.example.com/auth/oauth/discord/callback',
  express: { oauth2: { storage: true } },
});
```

Hybrid OAuth2 uses the same router start/callback routes and adds account
link/unlink endpoints:

```typescript
const hybridGithub = createExpressHybridOAuth2Auth({
  provider: 'github',
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: 'https://api.example.com/auth/oauth/github/callback',
  express: { oauth2: { storage: true } },
});

app.use('/auth', createAuthRouter(auth, {
  strategy: 'github',
  routes: {
    hybridLink: { path: '/oauth/:provider/link' },
    hybridUnlink: { path: '/oauth/:provider/link' },
  },
}));
```

Use bearer tokens for machine clients, public APIs and mobile clients that
manage tokens explicitly. Use HTTP-only cookies for browser apps where you want
the browser to carry tokens automatically and reduce JavaScript token exposure.
For cookie auth, keep CSRF protection and SameSite policy explicit.

Cookie helpers use secure defaults:

```typescript
import { setAuthCookies, clearAuthCookies, readTokenCookie } from '@soapjs/soap-express/auth';

setAuthCookies(res, {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
}, {
  access: { name: 'access_token', sameSite: 'lax' },
  refresh: { name: 'refresh_token', sameSite: 'lax' },
});

const accessToken = readTokenCookie(req, 'access_token');
clearAuthCookies(res);
```

By default cookies are `httpOnly`, `sameSite: 'lax'`, `path: '/'`, and
`secure: true` in production.

### Common Auth Recipes

Local login plus JWT refresh:

```typescript
const auth = new SoapAuth({
  http: {
    local: createExpressLocalAuth({
      credentials: {
        extractCredentials: ctx => ({
          identifier: ctx.body.email,
          password: ctx.body.password,
        }),
        verifyCredentials: (email, password) => users.verifyPassword(email, password),
      },
      jwt: createExpressJwtAuth({
        accessSecret: process.env.JWT_ACCESS_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        user: {
          fetchUser: payload => users.findById((payload as any).sub),
        },
      }),
    }),
    jwt: createExpressJwtAuth({
      accessSecret: process.env.JWT_ACCESS_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      user: {
        fetchUser: payload => users.findById((payload as any).sub),
      },
    }),
  },
});

app.use('/auth', createAuthRouter(auth, {
  strategy: 'local',
  routes: {
    login: { path: '/local/login' },
    refresh: { strategy: 'jwt', path: '/jwt/refresh' },
  },
}));
```

API key for machine endpoints:

```typescript
const apiKey = createExpressApiKeyAuth({
  keyType: 'long-term',
  extractApiKey: ctx => ctx.getHeader('x-api-key') ?? null,
  retrieveUserByApiKey: key => machines.findByApiKey(key),
});

app.post(
  '/jobs',
  authMiddleware(auth, 'apiKey'),
  requirePermissions('jobs:write'),
  createJobHandler,
);
```

Custom strategy without rewriting Express integration:

```typescript
const customStrategy = {
  name: 'internal',
  async authenticate(ctx) {
    const token = ctx.getHeader('x-internal-token');
    const service = await internalTokens.verify(token);
    return service ? { user: service } : null;
  },
};

app.use('/internal-auth', createAuthRouter(customStrategy));
app.get('/internal', authMiddleware(customStrategy, 'internal'), handler);
```

Migrating from manual middleware:

```typescript
// Before
app.get('/admin', verifyJwt, requireAdminRole, handler);

// After
app.get('/admin', authMiddleware(auth, 'jwt'), requireRoles('admin'), handler);
```

## CQRS & Domain Events

soap-express ships decorators that register CQRS handlers and domain-event
consumers in the DI container at decoration time. `wireCqrs` (enabled via
`bootstrap({ cqrs: true })`) connects command/query handlers to in-memory buses.

### Commands & Queries

```typescript
import { CommandHandler, QueryHandler } from '@soapjs/soap-express/cqrs';
import { BaseCommand, BaseQuery } from '@soapjs/soap/cqrs';
import { Inject } from '@soapjs/soap/common';

export class CreateUserCommand extends BaseCommand {
  constructor(public readonly email: string) { super(); }
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler {
  constructor(@Inject('UserRepository') private readonly repo: UserRepository) {}
  async handle(cmd: CreateUserCommand): Promise<Result<User>> { /* ... */ }
}
```

With `cqrs: true`, `CommandBus` and `QueryBus` are bound in the container and
every decorated handler is registered. Controllers inject the buses and dispatch:

```typescript
@Inject('CommandBus') private readonly commandBus: CommandBus;
const result = await this.commandBus.dispatch(new CreateUserCommand(email));
```

### Domain Events

```typescript
import { EventHandler, IEventHandler } from '@soapjs/soap-express/cqrs';
import { BaseDomainEvent } from '@soapjs/soap/domain';

export class UserCreatedEvent extends BaseDomainEvent { /* ... */ }

@EventHandler(UserCreatedEvent)
export class SendWelcomeEmail implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> { /* ... */ }
}
```

> **Multiple handlers per event (fan-out):** since **0.3.1** the default DI token is
> `EventHandler:<eventName>:<handlerClass>`, so several handlers can subscribe to the
> same event without colliding. (Before 0.3.1 the token was the event name alone, so a
> second handler silently overwrote the first.) Pass `{ token }` to override it.

> **Note:** `@EventHandler` only *registers* handlers in `DecoratorRegistry` — unlike
> `wireCqrs`, soap-express does not auto-wire a domain-event bus. Dispatch is up to you:
> read `DecoratorRegistry.getEventHandlers()` and bind/subscribe them to your bus (e.g.
> an in-memory bus that routes by event type).

## Request/Response Transformation

### Using @CallUseCase

The `@CallUseCase` decorator allows you to delegate route handling to a use case, keeping controllers clean. **Important**: Use cases should follow Clean Architecture principles - they receive `input` and return `Result<output>`, never directly handle `Request` or `Response` objects.

**Flow**: `Request` → `RouteIO.from()` → `UseCase.execute(input)` → `Result<output>` → `RouteIO.to()` → `Response`

```typescript
import { CallUseCase } from '@soapjs/soap-express';

@Injectable()
class GetUsersUseCase {
  constructor(@Inject('UserService') private userService: UserService) {}

  async execute(input: { page?: number; limit?: number }) {
    return await this.userService.getUsers(input);
  }
}

@Controller('/api/users')
class UserController {
  @Get('/')
  @CallUseCase(GetUsersUseCase)
  @RouteIO({
    from: (req: Request) => ({ page: req.query.page, limit: req.query.limit }),
    to: (result: any, res: Response) => {
      if (result.isSuccess()) {
        res.json({ success: true, data: result.content });
      } else {
        res.status(500).json({ success: false, error: result.failure!.error.message });
      }
    }
  })
  async getUsers() {
    // Method body ignored - RouteIO transforms Request → input, 
    // GetUsersUseCase.execute(input) → result, RouteIO transforms result → Response
  }
}
```

### Using RouteIO for Data Transformation

RouteIO provides powerful request/response transformation:

```typescript
import { RouteIO, ExpressIO } from '@soapjs/soap-express';

// 1. Using mapping functions
@Post('/')
@RouteIO({
  from: (req: Request) => ({
    name: req.body.name,
    email: req.body.email,
    // Transform request data
  }),
  to: (result: any, res: Response) => {
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  }
})
async createUser() {
  // Use case receives transformed data
}

// 2. Using ExpressIO class
class UserIO implements ExpressIO {
  from<T = Request>(source: T) {
    const req = source as Request;
    return {
      name: req.body.name,
      email: req.body.email,
      // Custom transformation logic
    };
  }

  to<T = Response>(result: any, target: T) {
    const res = target as Response;
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });
  }
}

@Post('/')
@RouteIO(new UserIO())
async createUser() {
  // Uses UserIO for transformation
}
```


## Advanced Routing

### Using @soapjs/soap Route System

```typescript
import { Route, GetRoute, PostRoute, RouteGroup, RouteRegistry } from '@soapjs/soap/http';

// Individual routes
const userRoute = new GetRoute('/api/users/:id', {
  cors: { origin: true },
  rateLimit: { maxRequests: 100, windowMs: 60000 },
  roles: { authenticatedOnly: true }
});

const createUserRoute = new PostRoute('/api/users', {
  validation: {
    request: {
      schema: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true, format: 'email' }
      }
    }
  },
  roles: { allow: ['admin', 'user'] }
});

// Route groups
const userGroup = new RouteGroup('/api/v2/users', {
  cors: { origin: ['https://myapp.com'] },
  rateLimit: { maxRequests: 200, windowMs: 60000 }
});

userGroup.addRoute(userRoute);
userGroup.addRoute(createUserRoute);

// Registration
app.registerRoute(userRoute);
app.registerRouteGroup(userGroup);
```

### Route Registry

```typescript
import { RouteRegistry } from '@soapjs/soap/http';

const registry = app.getRouteRegistry();

// Add routes to registry
registry.addRoute(userRoute);
registry.addRouteGroup(userGroup);

// Get all routes
const allRoutes = registry.getAllRoutes();

// Get routes by method
const getRoutes = registry.getRoutesByMethod('GET');
```

## Middleware System

### Built-in Middleware

```typescript
import { 
  AuthMiddleware, 
  ValidationMiddleware, 
  CorsMiddleware, 
  RateLimitMiddleware,
  LoggingMiddleware,
  CacheMiddleware 
} from '@soapjs/soap-express';

// Global middleware
app.use(new CorsMiddleware({
  origin: ['http://localhost:3000'],
  credentials: true
}));

app.use(new RateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

app.use(new LoggingMiddleware({
  level: 'info',
  format: 'combined'
}));
```

### Custom Middleware

```typescript
import { Middleware } from '@soapjs/soap-express';

class CustomMiddleware implements Middleware {
  async execute(req: Request, res: Response, next: NextFunction) {
    // Custom logic
    console.log('Custom middleware executed');
    next();
  }
}

app.use(new CustomMiddleware());
```

### Route-specific Middleware

```typescript
@Get('/')
@Middleware(new CustomMiddleware())
@Middleware(new ValidationMiddleware({ schema: userSchema }))
async getUsers(req: Request, res: Response) {
  // Route with specific middleware
}
```

## Error Handling

### Global Error Handler

```typescript
const app = new SoapExpressApp({
  errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Global error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  },
  errorHandlerOptions: {
    includeStack: process.env.NODE_ENV === 'development',
    includeRequest: true
  }
});
```

### Route-specific Error Handling

```typescript
@Get('/')
@ErrorHandler((error: Error, req: Request, res: Response) => {
  if (error.name === 'ValidationError') {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
async getUsers(req: Request, res: Response) {
  // Route with custom error handling
}
```

### Use Case Error Handling

```typescript
@Injectable()
class GetUsersUseCase {
  async execute(input: { page?: number; limit?: number }) {
    try {
      return await this.userService.getUsers(input);
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }
}
```

## Best Practices

### 1. Service Architecture

```typescript
// ✅ Good: Separate concerns
@Injectable()
class UserService {
  async getUsers() {
    return await this.userRepository.findAll();
  }
}

@Injectable()
class UserRepository {
  async findAll() {
    // Database logic
  }
}

// ❌ Bad: Mixed concerns
@Injectable()
class UserService {
  async getUsers() {
    // Database logic mixed with business logic
    const users = await db.query('SELECT * FROM users');
    return users.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }));
  }
}
```

### 2. Use Case Pattern

```typescript
// ✅ Good: Use cases for complex operations
@Injectable()
class CreateUserUseCase {
  constructor(
    @Inject('UserService') private userService: UserService,
    @Inject('EmailService') private emailService: EmailService,
    @Inject('ValidationService') private validationService: ValidationService
  ) {}

  async execute(input: CreateUserInput) {
    // Validate input
    await this.validationService.validateUser(input);
    
    // Create user
    const user = await this.userService.createUser(input);
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email);
    
    return user;
  }
}

@Controller('/api/users')
class UserController {
  @Post('/')
  @CallUseCase(CreateUserUseCase)
  async createUser() {
    // Clean controller - use case handles everything
  }
}
```

### 3. Error Handling

```typescript
// ✅ Good: Specific error types
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

@Injectable()
class GetUserUseCase {
  async execute(input: { id: string }) {
    const user = await this.userService.getUserById(input.id);
    if (!user) {
      throw new UserNotFoundError(input.id);
    }
    return user;
  }
}
```

### 4. Authentication

```typescript
// ✅ Good: Clear auth requirements
@Controller('/api/users')
class UserController {
  @Get('/')
  @Public() // Explicitly public
  async getUsers() { }

  @Get('/profile')
  @Auth('jwt') // Simple auth
  async getProfile() { }

  @Post('/')
  @Auth({ 
    strategy: 'jwt', 
    roles: { allow: ['admin', 'user'] } 
  }) // Complex auth
  async createUser() { }
}
```

### 5. Data Transformation

```typescript
// ✅ Good: Use RouteIO for transformation
  @Post('/')
  @CallUseCase(CreateUserUseCase)
  @RouteIO({
    from: (req: Request) => ({
      name: req.body.name,
      email: req.body.email.toLowerCase().trim()
    }),
    to: (result: any, res: Response) => {
      if (result.isSuccess()) {
        res.status(201).json({
          success: true,
          data: result.content,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.failure!.error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  })
  async createUser() { }
```

## API Reference

### SoapExpressApp

#### Constructor Options

```typescript
interface SoapExpressOptions {
  container?: DIContainer;
  errorHandler?: (error: Error, req: Request, res: Response, next: NextFunction) => void;
  errorHandlerOptions?: {
    includeStack?: boolean;
    includeRequest?: boolean;
    logger?: (error: Error, req: Request, res: Response) => void;
    sentry?: (error: Error, req: Request, res: Response) => void;
    custom?: (error: Error, req: Request, res: Response) => void;
  };
  middlewares?: any[];
  cors?: any;
  rateLimit?: any;
  logging?: any;
}
```

#### Methods

- `registerController(controller)` - Register controller(s)
- `registerRouter(router)` - Register router
- `registerRoute(route)` - Register individual route
- `registerRouteGroup(group)` - Register route group
- `registerMiddleware(middleware, ready?)` - Register middleware
- `registerAuthStrategy(strategy)` - Register a single auth strategy
- `registerAuth(provider)` - Register all HTTP strategies from a soap-auth-compatible provider
- `getRouteRegistry()` - Get route registry
- `getMiddlewareRegistry()` - Get middleware registry
- `getAuthRegistry()` - Get auth registry
- `getAuthMiddlewareFactory()` - Get auth middleware factory
- `start(port)` - Start HTTP server
- `healthCheck()` - Add health check endpoint
- `getApp()` - Get Express app instance
- `getServer()` - Get HTTP server instance
- `getContainer()` - Get DI container

### Decorators

#### Route Decorators

- `@Controller(basePath)` - Mark class as controller
- `@Get(path, options?)` - GET route
- `@Post(path, options?)` - POST route
- `@Put(path, options?)` - PUT route
- `@Delete(path, options?)` - DELETE route
- `@Patch(path, options?)` - PATCH route
- `@Head(path, options?)` - HEAD route
- `@Options(path, options?)` - OPTIONS route
- `@Trace(path, options?)` - TRACE route
- `@Connect(path, options?)` - CONNECT route
- `@All(path, options?)` - All methods route

#### Auth Decorators

- `@Auth(strategy | options)` - Authentication decorator
- `@AdminOnly(strategy?)` - Admin only access
- `@RolesOnly(roles, strategy?)` - Specific roles only
- `@SelfOnly(strategy?)` - Resource owner only
- `@Public()` - Public endpoint (no auth)

#### CQRS Decorators

- `@CommandHandler(commandType, options?)` - Register a command handler
- `@QueryHandler(queryType, options?)` - Register a query handler
- `@EventHandler(eventType, options?)` - Register a domain-event handler (pass `{ token }` for multiple handlers per event)

#### Other Decorators

- `@CallUseCase(useCaseClass)` - Delegate to use case
- `@RouteIO(ioOrMapping)` - Request/response transformation
- `@Middleware(middleware)` - Route-specific middleware
- `@ErrorHandler(handler)` - Route-specific error handling

### Types

```typescript
// Auth types (from @soapjs/soap)
interface AuthUser {
  id: string | number;
  email?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

interface AuthRequest extends Request {
  user?: AuthUser;
  auth?: {
    token?: string;
    type?: string;
    payload?: any;
  };
  session?: any;
  sessionID?: string;
}

interface RoleConfig {
  authenticatedOnly?: boolean;
  allow?: string[];
  deny?: string[];
  selfOnly?: boolean | ((user: AuthUser, resourceId: string) => boolean);
  customCheck?: (user: AuthUser, req: AuthRequest) => boolean | Promise<boolean>;
}

// Route options
interface RouteAdditionalOptions {
  cors?: RouteCorsOptions;
  security?: RouteSecurityOptions;
  rateLimit?: RouteRateLimitOptions;
  validation?: RouteValidationOptions;
  session?: any;
  cache?: any;
  logging?: any;
  analytics?: any;
  audit?: any;
  roles?: RoleConfig;
  middlewares?: any;
  compression?: any;
}
```

## Migration Guide

### From Previous Versions

#### Removed Features
- WebSocket support (moved to `@soapjs/soap-socket`)
- Socket.IO integration
- WebSocket decorators and controllers
- Old DI system (`DI.registerClass`, `DI.registerValue`, etc.)

#### New Features in 0.6.x
- **Modern DI System**: New `DI.bind().toClass()` API
- **Plugin System**: Extensible plugin architecture
- **CQRS Decorators**: Command, Query, Event handlers
- **CQRS Wiring**: `wireCqrs` and `bootstrap({ cqrs: true })`
- **Auth Adapter Layer**: Express context, middleware, router, cookies, OAuth2 storage and recipe wrappers for `@soapjs/soap-auth`
- **Auto Documentation**: Automatic API documentation generation
- **Enhanced Type Safety**: Full TypeScript support
- **Better Error Handling**: Improved error management
- **HTTP-only Focus**: Better performance
- **Auth Decorators**: Built-in authentication
- **Advanced Routing**: @soapjs/soap Route system integration

### Official Companion Packages

SoapJS 0.14.0+ keeps framework concerns in focused packages. `soap-express`
accepts their HTTP plugins and adapters through the core `HttpPlugin`,
middleware, CQRS, and drainable interfaces:

- `@soapjs/cli` — project and resource scaffolding
- `@soapjs/soap-auth` — framework-neutral auth strategies and recipes
- `@soapjs/soap-openapi` — `DocumentationPlugin` and OpenAPI decorators
- `@soapjs/soap-otel` — `TracingPlugin` and request tracing middleware
- `@soapjs/soap-zod` — Zod 4 request contracts for validation and OpenAPI
- `@soapjs/soap-mongo` — MongoDB data source/session/transaction adapters
- `@soapjs/soap-sql` — SQL data source/session/transaction adapters
- `@soapjs/soap-kafka` — Kafka event bus and domain event bus adapters
- `@soapjs/soap-socket` — Socket.IO/WebSocket support outside the HTTP package

Example:

```typescript
import { bootstrap } from '@soapjs/soap-express';
import { DocumentationPlugin } from '@soapjs/soap-openapi';
import { TracingPlugin } from '@soapjs/soap-otel';

await bootstrap({
  controllers: [UserController],
  plugins: [
    {
      plugin: new DocumentationPlugin(),
      options: {
        info: { title: 'Users API', version: '1.0.0' },
        openApiPath: '/openapi.json',
        interactivePath: '/docs',
      },
    },
    new TracingPlugin(),
  ],
});
```

### DI System Migration

```typescript
// Old way (deprecated)
DI.registerClass(UserService, 'UserService', { scope: Scope.SINGLETON });
DI.registerValue('API_KEY', 'your-api-key');
DI.registerFactory('Database', () => new Database());

// New way
DI.bind('UserService').toClass(UserService, { scope: Scope.SINGLETON });
DI.bind('API_KEY').toValue('your-api-key');
DI.bind('Database').toFactory(() => new Database());
```

#### Breaking Changes
- `SoapExpressOptions.container` is now optional (uses global container by default)
- WebSocket-related methods removed from `SoapExpressApp`
- WebSocket decorators removed
- Auth system refactored to use @soapjs/soap interfaces

### Metrics System

The framework includes a built-in metrics system that's exporter-agnostic. You can use any metrics client by implementing the `MetricsClient` interface.

#### Basic Usage

```typescript
import { SoapExpressApp, MetricsConfig, ConsoleMetricsClient } from '@soapjs/soap-express';

const app = new SoapExpressApp({});

// Enable built-in metrics through the core MetricsPlugin.
app.useMetrics({
  enabled: true,
  exposeEndpoint: true,
  metricsPath: '/metrics',
  metricsFormat: 'prometheus',
  metrics: {
    responseTime: true,
    requestCount: true,
    errorRate: true,
    memoryUsage: true,
    cpuUsage: true
  },
  client: new ConsoleMetricsClient(), // or your custom client
  collectInterval: 30000, // 30 seconds
  customLabels: {
    service: 'my-api',
    version: '1.0.0'
  }
});
```

#### Custom Metrics Client

```typescript
import { MetricsClient } from '@soapjs/soap-express';

class PrometheusClient implements MetricsClient {
  counter(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    // Your Prometheus implementation
  }

  histogram(name: string, value: number, labels?: Record<string, string | number>): void {
    // Your Prometheus implementation
  }

  gauge(name: string, value: number, labels?: Record<string, string | number>): void {
    // Your Prometheus implementation
  }

  summary(name: string, value: number, labels?: Record<string, string | number>): void {
    // Your Prometheus implementation
  }
}

app.useMetrics({
  enabled: true,
  exposeEndpoint: true,
  metrics: {
    responseTime: true,
    requestCount: true,
    errorRate: true,
    memoryUsage: true,
    cpuUsage: true
  },
  client: new PrometheusClient()
});
```

#### Custom Metrics

```typescript
// Get the metrics collector
const collector = app.getMetricsCollector();

// Record custom metrics
collector!.counter('api_requests_total', 1, { method: 'GET', route: '/api/users' });
collector!.histogram('response_time_seconds', 0.5, { route: '/api/users' });
collector!.gauge('active_connections', 25);
collector!.summary('database_query_time', 0.1, { table: 'users' });
```

#### Built-in Metrics

The system automatically collects:

- **Response Time**: `http_request_duration_seconds` (histogram)
- **Request Count**: `http_requests_total` (counter)
- **Error Rate**: `http_errors_total` (counter)
- **Memory Usage**: `process_memory_usage_bytes`, `process_memory_total_bytes` (gauges)
- **CPU Usage**: `process_cpu_usage_microseconds` (gauge)

### Memory Monitoring System

The framework includes a comprehensive memory monitoring system with automatic leak detection and threshold monitoring.

#### Basic Usage

```typescript
import { SoapExpressApp, MemoryMonitoringConfig } from '@soapjs/soap-express';

const app = new SoapExpressApp({});

// Enable memory monitoring
app.useMemoryMonitoring({
  enabled: true,
  interval: 30000, // Check every 30s
  threshold: {
    used: 512 * 1024 * 1024, // 512MB
    percentage: 80, // 80%
    heapUsed: 256 * 1024 * 1024, // 256MB
    rss: 512 * 1024 * 1024 // 512MB
  },
  leakDetection: {
    enabled: true,
    consecutiveGrowths: 3,
    growthThreshold: 10, // 10% growth
    maxHistory: 20
  },
  onLeak: (info) => {
    console.warn('Memory leak detected:', info);
    // Auto-restart or alert
  },
  onThreshold: (info) => {
    console.warn('Memory threshold exceeded:', info);
  }
});
```

#### Simple Configuration

```typescript
import { createMemoryConfig } from '@soapjs/soap-express';

// Use helper function for simple setup
const config = createMemoryConfig({
  threshold: '512MB',
  interval: 30000,
  onLeak: (info) => {
    console.warn('Memory leak detected:', info.severity);
  }
});

app.useMemoryMonitoring(config);
```

#### Memory Monitoring Features

- **Automatic Leak Detection**: Detects memory leaks based on consecutive growth patterns
- **Threshold Monitoring**: Alerts when memory usage exceeds configured limits
- **Memory History**: Tracks memory usage over time
- **Severity Levels**: Categorizes leaks as low, medium, high, or critical
- **Custom Labels**: Add custom labels for better monitoring context
- **Force GC**: Option to force garbage collection when issues are detected

#### Memory Information

The system provides detailed memory information:

```typescript
const monitor = app.getMemoryMonitor();
const stats = monitor!.getStats();
const summary = monitor!.getSummary();

console.log('Current memory:', stats.current);
console.log('Memory status:', summary.status);
console.log('Detected leaks:', summary.leaks);
```

#### Memory Thresholds

You can set thresholds for different memory metrics:

- **Used Memory**: Total memory used by the process
- **Memory Percentage**: Percentage of total system memory
- **Heap Used**: Memory used by the JavaScript heap
- **RSS**: Resident Set Size (physical memory)

#### Leak Detection

The system detects memory leaks by monitoring consecutive memory growth patterns:

- **Consecutive Growths**: Number of consecutive growths to trigger detection
- **Growth Threshold**: Minimum growth percentage to consider
- **Severity Levels**: Automatic severity classification based on growth rate

### Security System

`soap-express` exposes a lightweight Express security preset through
`app.useSecurity()`. It wires existing Express middleware lazily and keeps the
main package import small.

#### Basic Usage

```typescript
import { SoapExpressApp } from '@soapjs/soap-express';

const app = new SoapExpressApp({});
app.useSecurity({
  disablePoweredBy: true,
  trustProxy: true,
  helmet: true,
  cors: {
    origin: ['https://app.example.com'],
    credentials: true,
  },
  throttle: {
    global: { windowMs: 60_000, max: 300 },
  },
});
```

The same options can be passed to the constructor:

```typescript
const app = new SoapExpressApp({
  security: {
    disablePoweredBy: true,
    helmet: true,
    throttle: true,
  },
});
```

#### Request Throttling

Throttle can be configured globally, by route pattern, or by path group.
Route-level options have the highest precision and are useful for login,
refresh, OAuth callbacks and expensive business commands.

```typescript
app.useSecurity({
  throttle: {
    global: { windowMs: 60_000, max: 300 },
    routes: {
      'POST /auth/login': {
        windowMs: 60_000,
        max: 5,
        keyBy: req => req.body?.email ?? req.ip,
      },
      'POST /auth/refresh': {
        windowMs: 60_000,
        max: 20,
        keyBy: 'user',
      },
      'GET /auth/oauth/:provider/callback': {
        windowMs: 60_000,
        max: 30,
      },
    },
    groups: {
      '/api/admin/*': { windowMs: 60_000, max: 60 },
      '/api/public/*': { windowMs: 60_000, max: 1000 },
    },
  },
});
```

Routes can also opt in directly through route options:

```typescript
@Post('/login', {
  throttle: {
    windowMs: 60_000,
    max: 5,
    keyBy: req => req.body?.email ?? req.ip,
  },
})
async login(req: Request, res: Response) {
  // ...
}
```

`keyBy` supports:

- `'ip'` (default)
- `'user'` (`req.user.id`, falling back to IP)
- `'apiKey'` (`x-api-key`, falling back to IP)
- a custom `(req) => string` function

#### Scope

`useSecurity()` currently covers:

- `disablePoweredBy`
- `trustProxy`
- `helmet`
- `cors`
- request throttling/rate limiting

It intentionally does not implement automatic CSRF protection, input
sanitization or session storage. Those depend on application auth/session
choices and should be wired explicitly.

### WebSocket Support

For WebSocket functionality, use the separate package:

```bash
npm install @soapjs/soap-socket
```

This provides Socket.IO and WebSocket support with the same clean architecture.

## License

MIT
