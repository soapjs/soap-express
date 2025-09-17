import { SoapExpressApp } from '../src/app';
import { Controller, Get, Post, CallUseCase, UseCase } from '../src/decorators';
import { SimpleIO, PaginationIO } from '../src/route-io';
import { Result } from '@soapjs/soap';

// Example Use Case following soapjs/soap pattern
@UseCase()
export class GetUsersUseCase {
  async execute(input: { page: number; limit: number }): Promise<Result<any>> {
    // Simulate getting users with pagination
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];
    
    const pagination = {
      data: users,
      pagination: {
        page: input.page,
        limit: input.limit,
        total: users.length,
        pages: Math.ceil(users.length / input.limit),
        hasNext: input.page < Math.ceil(users.length / input.limit),
        hasPrev: input.page > 1
      }
    };
    
    return Result.withSuccess(pagination);
  }
}

@UseCase()
export class CreateUserUseCase {
  async execute(input: { name: string; email: string }): Promise<Result<any>> {
    // Simulate creating a user
    const user = {
      id: Math.floor(Math.random() * 1000),
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString()
    };
    
    return Result.withSuccess(user);
  }
}

// Example Controller using soapjs/soap components
@Controller('/api/users')
export class UsersController {
  @Get('/', { cors: { origin: '*' } })
  @CallUseCase(GetUsersUseCase)
  getUsers() {
    // This will be handled by the UseCase via CallUseCase decorator
  }

  @Post('/', { 
    cors: { origin: '*' },
    validation: {
      request: {
        schema: {
          validate: (data: any) => {
            if (!data.name || !data.email) {
              return { error: { details: [{ message: 'Name and email are required' }] } };
            }
            return { error: null };
          }
        }
      }
    }
  })
  @CallUseCase(CreateUserUseCase)
  createUser() {
    // This will be handled by the UseCase via CallUseCase decorator
  }
}

// Example of using soapjs/soap Route directly
import { Route, PostRoute, GetRoute } from '@soapjs/soap';

const directRoute = new PostRoute('/api/direct', async (req: any) => {
  return Result.withSuccess({ message: 'Direct route response' });
});

// Example Express App setup
async function createApp() {
  const app = new SoapExpressApp({
    cors: { origin: '*' },
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
  });

  // Register Use Cases in DI container
  app.registerClass(GetUsersUseCase);
  app.registerClass(CreateUserUseCase);
  
  // Register Controller
  app.registerController(UsersController);
  
  // Register direct route
  app.registerRoute(directRoute);
  
  // Add health check
  app.healthCheck();
  
  return app;
}

// Example usage
async function main() {
  const app = await createApp();
  
  try {
    await app.start(3000);
    console.log('Server started on port 3000');
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

// Export for use in other files
export { createApp, main };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
