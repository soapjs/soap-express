# @soapjs/soap-express

HTTP-focused Express.js integration for the @soapjs/soap framework with dependency injection support, authentication, and advanced routing capabilities.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Controllers & Routes](#controllers--routes)
- [Dependency Injection](#dependency-injection)
- [Authentication & Authorization](#authentication--authorization)
- [Request/Response Transformation](#requestresponse-transformation)
- [Advanced Routing](#advanced-routing)
- [Middleware System](#middleware-system)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)

## Features

- 🚀 **HTTP-Only Focus**: Clean separation from WebSocket functionality
- 🔧 **Dependency Injection**: Full integration with @soapjs/soap DI container
- 🎯 **Decorator-Based**: Clean, declarative API using decorators
- 🛡️ **Type Safety**: Full TypeScript support
- 🔐 **Authentication**: Built-in auth decorators and middleware factory
- 📦 **Middleware Support**: Built-in middleware for validation, CORS, rate limiting, etc.
- 🔄 **RouteIO**: Request/response transformation system
- ⚡ **Express Integration**: Seamless integration with Express.js
- 🎨 **Flexible Architecture**: Use DI with decorators or direct container access

## Installation

```bash
npm install @soapjs/soap-express @soapjs/soap express
```

## Quick Start

```typescript
import { SoapExpressApp, Controller, Get } from '@soapjs/soap-express';
import { container, registerClass, Injectable, Inject } from '@soapjs/soap';

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

// App setup
const app = new SoapExpressApp({ container });
registerClass('UserService', UserService);
app.registerController(UserController);
app.healthCheck();

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

### Using Decorators (Recommended)

```typescript
import { Injectable, Inject } from '@soapjs/soap';

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

// Registration
registerClass('UserService', UserService);
registerClass('EmailService', EmailService);
```

### Using Container Directly

```typescript
import { container } from '@soapjs/soap';

@Controller('/api/users')
class UserController {
  @Get('/')
  async getUsers(req: Request, res: Response) {
    const userService = container.get('UserService');
    const users = await userService.getUsers();
    res.json(users);
  }
}

// Registration
container.bindClass('UserService', UserService);
container.bindValue('config', { apiKey: 'secret' });
container.bindFactory('logger', () => new Logger());
```

### Service Registration Methods

```typescript
// Class registration
registerClass('UserService', UserService);
container.bindClass('UserService', UserService);

// Value registration
registerValue('config', { apiKey: 'secret' });
container.bindValue('config', { apiKey: 'secret' });

// Factory registration
registerFactory('logger', () => new Logger());
container.bindFactory('logger', () => new Logger());
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
// Note: Auth strategies come from @soapjs/soap-express-auth
// import { JWTStrategy, LocalStrategy } from '@soapjs/soap-express-auth';

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

## Request/Response Transformation

### Using @CallUseCase

The `@CallUseCase` decorator allows you to delegate route handling to a use case, keeping controllers clean:

```typescript
import { CallUseCase } from '@soapjs/soap-express';

@Injectable()
class GetUsersUseCase {
  constructor(@Inject('UserService') private userService: UserService) {}

  async execute(input: any) {
    return await this.userService.getUsers();
  }
}

@Controller('/api/users')
class UserController {
  @Get('/')
  @CallUseCase(GetUsersUseCase)
  async getUsers() {
    // This method body is ignored - GetUsersUseCase.execute() is called instead
    // The use case receives the request data and returns the response
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
  to: (res: Response, result: any) => {
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

### Combining @CallUseCase with RouteIO

```typescript
@Injectable()
class CreateUserUseCase {
  constructor(@Inject('UserService') private userService: UserService) {}

  async execute(input: { name: string; email: string }) {
    // input is already transformed by RouteIO
    return await this.userService.createUser(input);
  }
}

@Controller('/api/users')
class UserController {
  @Post('/')
  @CallUseCase(CreateUserUseCase)
  @RouteIO({
    from: (req: Request) => ({
      name: req.body.name,
      email: req.body.email
    }),
    to: (res: Response, result: any) => {
      res.status(201).json({
        success: true,
        data: result
      });
    }
  })
  async createUser() {
    // Method body ignored - use case handles everything
  }
}
```

## Advanced Routing

### Using @soapjs/soap Route System

```typescript
import { Route, GetRoute, PostRoute, RouteGroup, RouteRegistry } from '@soapjs/soap';

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
import { RouteRegistry } from '@soapjs/soap';

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
  async execute(input: any) {
    try {
      return await this.userService.getUsers();
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
  to: (res: Response, result: any) => {
    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
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
- `registerAuthStrategy(strategy)` - Register auth strategy
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
- WebSocket support (moved to @soapjs/soap-node-socket)
- Socket.IO integration
- WebSocket decorators and controllers

#### New Features
- Enhanced dependency injection integration
- Improved type safety
- Better error handling
- HTTP-only focus for better performance
- Auth decorators and middleware factory
- Advanced routing with @soapjs/soap Route system

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

// Enable built-in metrics
app.useMetrics({
  enabled: true,
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

The framework includes a comprehensive security system with built-in protection against common web vulnerabilities, implemented without external dependencies.

#### Basic Usage

```typescript
import { SoapExpressApp, SecurityConfig } from '@soapjs/soap-express';

const app = new SoapExpressApp({});

// Enable security features
app.useSecurity({
  enabled: true,
  headers: {
    enabled: true,
    headers: {
      contentSecurityPolicy: "default-src 'self'",
      frameOptions: 'DENY',
      contentTypeOptions: true,
      xssProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains'
    }
  },
  csrf: {
    enabled: true,
    secret: 'your-secret-key-change-in-production',
    cookieName: '_csrf',
    cookieOptions: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    }
  },
  sanitization: {
    enabled: true,
    options: {
      stripHtml: true,
      escapeSql: true,
      escapeHtml: true,
      preventPathTraversal: true,
      validateFileUploads: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
    }
  }
});
```

#### Security Headers

The system automatically sets security headers to protect against common attacks:

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS filtering
- **Referrer-Policy**: Controls referrer information
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS
- **Permissions-Policy**: Controls browser features
- **Cross-Origin Policies**: Controls cross-origin requests

#### CSRF Protection

Built-in CSRF protection without external dependencies:

```typescript
// CSRF token is automatically generated and validated
app.getApp().post('/api/users', (req, res) => {
  // CSRF token is available in res.locals.csrfToken
  res.json({ csrfToken: res.locals.csrfToken });
});

// Get CSRF token endpoint
app.getApp().get('/api/csrf-token', (req, res) => {
  const securityMiddleware = app.getSecurityMiddleware();
  const token = securityMiddleware!.getCSRFMiddleware().generateToken();
  res.json({ csrfToken: token });
});
```

#### Input Sanitization

Automatic sanitization of all request data:

```typescript
// HTML sanitization
app.getApp().post('/api/content', (req, res) => {
  // req.body is automatically sanitized
  // <script> tags are stripped, HTML entities are escaped
  res.json({ content: req.body.content });
});

// Custom sanitizers
app.useSecurity({
  sanitization: {
    enabled: true,
    options: {
      stripHtml: true,
      escapeHtml: true,
      preventPathTraversal: true
    },
    customSanitizers: {
      'email': (value) => value.toLowerCase().trim(),
      'phone': (value) => value.replace(/[^\d+\-\(\)\s]/g, ''),
      'username': (value) => value.replace(/[^a-zA-Z0-9_-]/g, '')
    }
  }
});
```

#### Security Presets

Pre-configured security levels:

```typescript
import { securityPresets } from '@soapjs/soap-express';

// Strict security for production
app.useSecurity({
  headers: securityPresets.strict,
  csrf: { enabled: true, secret: 'production-secret' },
  sanitization: { enabled: true, options: { stripHtml: true } }
});

// Balanced security for development
app.useSecurity({
  headers: securityPresets.balanced,
  csrf: { enabled: false },
  sanitization: { enabled: true, options: { stripHtml: false } }
});

// Minimal security
app.useSecurity({
  headers: securityPresets.minimal,
  csrf: { enabled: false },
  sanitization: { enabled: false }
});
```

#### Security Monitoring

Track security violations and get statistics:

```typescript
const securityMiddleware = app.getSecurityMiddleware();

// Get security violations
const violations = securityMiddleware.getSecurityViolations();

// Get security statistics
const stats = securityMiddleware.getSecurityStats();

// Clear violations
securityMiddleware.clearViolations();
```

#### Security Endpoints

Built-in security endpoints for monitoring:

```typescript
import { createSecurityEndpoints } from '@soapjs/soap-express';

const securityMiddleware = app.getSecurityMiddleware();
const endpoints = createSecurityEndpoints(securityMiddleware);

// Security status endpoint
app.getApp().get('/security/status', endpoints.status);

// CSRF token endpoint
app.getApp().get('/security/csrf-token', endpoints.csrfToken);

// Security violations endpoint
app.getApp().get('/security/violations', endpoints.violations);
```

#### File Upload Security

Automatic validation of file uploads:

```typescript
app.useSecurity({
  sanitization: {
    enabled: true,
    options: {
      validateFileUploads: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    }
  }
});

// File uploads are automatically validated
app.getApp().post('/api/upload', (req, res) => {
  // req.files is validated and sanitized
  res.json({ files: req.files });
});
```

#### Security Features

- **No External Dependencies**: Built using only Node.js built-in modules
- **Automatic Protection**: All requests are automatically protected
- **Configurable**: Fine-grained control over security features
- **Monitoring**: Track security violations and statistics
- **Presets**: Pre-configured security levels for different environments
- **Custom Sanitizers**: Add your own sanitization logic
- **File Upload Validation**: Automatic validation of uploaded files
- **CSRF Protection**: Built-in CSRF token generation and validation

### WebSocket Support

For WebSocket functionality, use the separate package:

```bash
npm install @soapjs/soap-node-socket
```

This provides Socket.IO and WebSocket support with the same clean architecture.

## License

MIT