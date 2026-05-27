import { 
  SoapExpressApp, 
  Controller, 
  Get, 
  Post,
  Route,
  GetRoute,
  PostRoute,
  RouteGroup,
  RouteRegistry,
  MiddlewareRegistry,
  AuthType,
  AuthStrategy,
  Auth,
  AdminOnly,
  RolesOnly,
  Public,
  SelfOnly,
  ExpressRouter
} from '../src';
import { container, Injectable, Inject } from '@soapjs/soap';

// Example service with dependency injection
@Injectable()
class UserService {
  async getUsers() {
    return [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];
  }

  async createUser(userData: any) {
    return { id: Date.now(), ...userData, createdAt: new Date() };
  }

  async getUserById(id: string) {
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  async updateUser(id: string, userData: any) {
    return { id, ...userData, updatedAt: new Date() };
  }
}

// Example controller with auth decorators
@Controller('/api/users')
class UserController {
  constructor(@Inject('UserService') private userService: UserService) {}

  @Get('/')
  @Public() // No authentication required
  async getUsers(req: any, res: any) {
    const users = await this.userService.getUsers();
    res.json(users);
  }

  @Get('/profile')
  @Auth('jwt') // Simple strategy name
  async getProfile(req: any, res: any) {
    res.json({ user: req.user });
  }

  @Post('/')
  @Auth({ 
    strategy: 'jwt', 
    roles: { allow: ['admin', 'user'] } 
  })
  async createUser(req: any, res: any) {
    const user = await this.userService.createUser(req.body);
    res.status(201).json(user);
  }

  @Get('/admin')
  @AdminOnly('jwt') // Requires admin role with JWT
  async adminOnly(req: any, res: any) {
    res.json({ message: 'Admin access granted' });
  }

  @Get('/:id')
  @SelfOnly('jwt') // Only the user themselves can access their data
  async getUserById(req: any, res: any) {
    const user = await this.userService.getUserById(req.params.id);
    res.json(user);
  }

  @Post('/:id/update')
  @RolesOnly(['admin', 'moderator'], 'jwt') // Multiple roles allowed
  async updateUser(req: any, res: any) {
    const user = await this.userService.updateUser(req.params.id, req.body);
    res.json(user);
  }
}

// Example usage with advanced features
async function main() {
  // Register services using the global container
  container.autoRegister(UserService);

  // Alternative with explicit token:
  // container.bindClass('UserService', UserService);

  // Create app
  const app = new SoapExpressApp({
    container,
    errorHandlerOptions: {
      includeStack: true
    }
  });

  // Note: Auth strategies would be registered from @soapjs/soap-express-auth
  // Example of how it would work:
  // 
  // import { JWTStrategy, LocalStrategy, GoogleStrategy } from '@soapjs/soap-express-auth';
  // 
  // app.registerAuthStrategy(new JWTStrategy({
  //   secret: process.env.JWT_SECRET || 'your-secret-key',
  //   algorithms: ['HS256'],
  //   issuer: 'your-app',
  //   audience: 'your-users'
  // }));
  // 
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

  // Register controllers
  app.registerController(UserController);

  // Example: Register routes using @soapjs/soap components
  const userRoutes = new RouteGroup('/api/v2/users', {
    cors: { origin: true, credentials: true },
    rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }
  });

  userRoutes.add(new GetRoute('/', async (req: any, res: any) => {
    const users = await app.getService<UserService>('UserService').getUsers();
    res.json(users);
  }));

  userRoutes.add(new PostRoute('/', async (req: any, res: any) => {
    const user = await app.getService<UserService>('UserService').createUser(req.body);
    res.status(201).json(user);
  }));

  app.registerRouteGroup(userRoutes);

  // Example: Register individual route
  const healthRoute = new GetRoute('/api/health', async (req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }, {
    cache: { ttl: 60 }
  });

  app.registerRoute(healthRoute);

  // Example: Protected route with auth middleware
  const protectedRoute = new GetRoute('/api/protected', async (req: any, res: any) => {
    res.json({ 
      message: 'This is a protected route',
      user: req.user,
      auth: req.auth
    });
  }, {
    roles: {
      authenticatedOnly: true,
      allow: ['admin', 'user']
    }
  });

  app.registerRoute(protectedRoute);

  // Example: Admin only route
  const adminRoute = new GetRoute('/api/admin', async (req: any, res: any) => {
    res.json({ 
      message: 'Admin only route',
      user: req.user
    });
  }, {
    roles: {
      authenticatedOnly: true,
      allow: ['admin']
    }
  });

  app.registerRoute(adminRoute);

  // Example: Router with custom error handler
  const apiRouter = new ExpressRouter('/api/v3');
  
  // Set router-level error handler
  apiRouter.setErrorHandler({
    handler: (error: Error, req: any, res: any) => {
      console.error('API Error:', error.message);
      res.status(500).json({
        error: 'API Error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add routes to router
  apiRouter.get('/status', async (req: any, res: any) => {
    res.json({ status: 'ok', version: 'v3' });
  });

  apiRouter.get('/error', async (req: any, res: any) => {
    throw new Error('This will be handled by router error handler');
  });

  // Register router
  app.registerRouter(apiRouter);

  // Add health check
  app.healthCheck();

  // Start server
  await app.start(3000);
  console.log('Server started on http://localhost:3000');
  console.log('Health check: http://localhost:3000/health');
  console.log('Users API: http://localhost:3000/api/users');
  console.log('Public users: http://localhost:3000/api/users (no auth)');
  console.log('User profile: http://localhost:3000/api/users/profile (requires JWT)');
  console.log('Admin only: http://localhost:3000/api/users/admin (requires admin role)');
  console.log('Self access: http://localhost:3000/api/users/:id (self only)');
  console.log('API v3 status: http://localhost:3000/api/v3/status');
  console.log('API v3 error test: http://localhost:3000/api/v3/error (will trigger router error handler)');
  console.log('');
  console.log('Auth decorators used:');
  console.log('- @Public() - no authentication required');
  console.log('- @Auth("jwt") - simple strategy name');
  console.log('- @Auth({ strategy: "jwt", roles: { allow: ["admin"] } }) - full options');
  console.log('- @AdminOnly("jwt") - requires admin role');
  console.log('- @SelfOnly("jwt") - only resource owner can access');
  console.log('- @RolesOnly(["admin", "moderator"], "jwt") - multiple roles');
  console.log('');
  console.log('Note: Auth strategies need to be registered from @soapjs/soap-express-auth');
  console.log('Example: app.registerAuthStrategy(new JWTStrategy({...}))');
  console.log('');
  console.log('Router Error Handling:');
  console.log('- Use router.setErrorHandler() to set router-level error handler');
  console.log('- Router error handler takes priority over app error handler');
  console.log('- If no router error handler, falls back to app error handler');
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
