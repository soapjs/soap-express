import { SoapExpressApp, Controller, Get, Auth } from '../src';
import { container, registerClass, Injectable, Inject } from '@soapjs/soap';
import { createAuthPlugin, SoapAuthConfig } from './soap-express-auth-plugin';

// Example service for user management
@Injectable()
class UserService {
  private users = [
    { id: 1, email: 'user@example.com', password: '$2b$10$...', role: 'user' },
    { id: 2, email: 'admin@example.com', password: '$2b$10$...', role: 'admin' }
  ];

  async findByEmail(email: string) {
    return this.users.find(u => u.email === email) || null;
  }

  async findById(id: number) {
    return this.users.find(u => u.id === id) || null;
  }

  async verifyPassword(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) return false;
    
    // In real application use bcrypt.compare
    return password === 'password123';
  }

  async getUsers() {
    return this.users.map(u => ({ id: u.id, email: u.email, role: u.role }));
  }
}

// Controller with auth decorators
@Controller('/api/users')
class UserController {
  constructor(@Inject('UserService') private userService: UserService) {}

  @Get('/')
  @Auth('jwt') // Uses JWT strategy from plugin
  async getUsers(req: any, res: any) {
    const users = await this.userService.getUsers();
    res.json({ users, currentUser: req.user });
  }

  @Get('/profile')
  @Auth('jwt')
  async getProfile(req: any, res: any) {
    res.json({ user: req.user });
  }

  @Get('/admin')
  @Auth('jwt') // In real app, you'd add role checking
  async adminOnly(req: any, res: any) {
    res.json({ message: 'Admin access granted', user: req.user });
  }
}

// Main application
async function main() {
  // Register services
  registerClass('UserService', UserService);

  // Create app
  const app = new SoapExpressApp({ container });

  // Configure auth plugin
  const authConfig: SoapAuthConfig = {
    session: {
      secret: 'your-session-secret',
      resave: false,
      saveUninitialized: false
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-jwt-secret',
      accessToken: {
        expiresIn: '1h',
        issuer: 'your-app',
        audience: 'your-users'
      },
      refreshToken: {
        expiresIn: '7d'
      },
      fetchUser: async (payload: any) => {
        const userService = app.getService<UserService>('UserService');
        return await userService.findById(payload.id);
      }
    },
    local: {
      extractCredentials: (req: any) => ({
        identifier: req.body.email,
        password: req.body.password
      }),
      verifyCredentials: async (email: string, password: string) => {
        const userService = app.getService<UserService>('UserService');
        return await userService.verifyPassword(email, password);
      },
      fetchUser: async (credentials: any) => {
        const userService = app.getService<UserService>('UserService');
        return await userService.findByEmail(credentials.identifier);
      }
    },
    oauth2: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        endpoints: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token'
        },
        fetchUser: async (profile: any) => {
          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: 'user'
          };
        }
      }
    }
  };

  // Create and use auth plugin
  const authPlugin = createAuthPlugin(authConfig);
  app.usePlugin(authPlugin);

  // Register controllers
  app.registerController(UserController);

  // Health check
  app.healthCheck();

  // Start server
  await app.start(3000);
  
  console.log('🚀 Server started on http://localhost:3000');
  console.log('');
  console.log('📚 Available endpoints:');
  console.log('  - POST /auth/login (local auth)');
  console.log('  - POST /auth/refresh (refresh JWT token)');
  console.log('  - GET /auth/google (OAuth2 Google)');
  console.log('  - GET /auth/google/callback (OAuth2 callback)');
  console.log('  - GET /api/users (JWT required)');
  console.log('  - GET /api/users/profile (JWT required)');
  console.log('  - GET /api/users/admin (JWT required)');
  console.log('  - GET /health (health check)');
  console.log('');
  console.log('🔐 Test login:');
  console.log('  curl -X POST http://localhost:3000/auth/login \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"email": "user@example.com", "password": "password123"}\'');
  console.log('');
  console.log('🔑 Test protected endpoint:');
  console.log('  curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
  console.log('    http://localhost:3000/api/users/profile');
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main, UserController, UserService };
