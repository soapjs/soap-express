import { SoapExpressApp, Controller, Get, Post, Put, Delete } from '@soapjs/soap-express';
import { Injectable, Inject, registerClass } from '@soapjs/soap';
import { 
  ApiDoc, 
  ApiResponse, 
  ApiParameter, 
  ApiTags, 
  ApiSummary, 
  ApiDescription,
  addDocumentationEndpoints
} from '../src/documentation';

// Example service
@Injectable()
class UserService {
  private users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
  ];

  async getUsers() {
    return this.users;
  }

  async getUserById(id: number) {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createUser(userData: { name: string; email: string; role: string }) {
    const newUser = {
      id: this.users.length + 1,
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<{ name: string; email: string; role: string }>) {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    this.users[userIndex] = { ...this.users[userIndex], ...userData };
    return this.users[userIndex];
  }

  async deleteUser(id: number) {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    const deletedUser = this.users[userIndex];
    this.users.splice(userIndex, 1);
    return deletedUser;
  }
}

// User controller with comprehensive API documentation
@Controller('/api/users', {
  tags: ['users'],
  description: 'User management operations',
  externalDocs: {
    description: 'Find out more about our API',
    url: 'https://docs.example.com'
  }
})
class UserController {
  constructor(@Inject('UserService') private userService: UserService) {}

  @Get('/')
  @ApiDoc({
    summary: 'Get all users',
    description: 'Retrieves a list of all users in the system',
    tags: ['users'],
    responses: {
      '200': {
        description: 'List of users retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse('200', {
    description: 'List of users retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' }
        }
      }
    }
  })
  @ApiTags('users', 'public')
  async getUsers(req: any, res: any) {
    const users = await this.userService.getUsers();
    res.json(users);
  }

  @Get('/:id')
  @ApiDoc({
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their unique identifier',
    tags: ['users'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        schema: { type: 'number' }
      }
    ],
    responses: {
      '200': {
        description: 'User found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      },
      '404': {
        description: 'User not found'
      }
    }
  })
  @ApiParameter({
    name: 'id',
    in: 'path',
    description: 'User ID',
    required: true,
    schema: { type: 'number' }
  })
  @ApiResponse('200', {
    description: 'User found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' }
      }
    }
  })
  @ApiResponse('404', {
    description: 'User not found'
  })
  @ApiTags('users')
  async getUserById(req: any, res: any) {
    const { id } = req.params;
    const user = await this.userService.getUserById(parseInt(id));
    res.json(user);
  }

  @Post('/')
  @ApiDoc({
    summary: 'Create a new user',
    description: 'Creates a new user in the system',
    tags: ['users'],
    requestBody: {
      description: 'User data',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'role'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['user', 'admin'] }
            }
          }
        }
      }
    },
    responses: {
      '201': {
        description: 'User created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      },
      '400': {
        description: 'Invalid input data'
      }
    }
  })
  @ApiSummary('Create a new user')
  @ApiDescription('Creates a new user in the system with the provided information')
  @ApiTags('users', 'admin')
  async createUser(req: any, res: any) {
    const userData = req.body;
    const newUser = await this.userService.createUser(userData);
    res.status(201).json(newUser);
  }

  @Put('/:id')
  @ApiDoc({
    summary: 'Update user',
    description: 'Updates an existing user with new information',
    tags: ['users'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        schema: { type: 'number' }
      }
    ],
    requestBody: {
      description: 'Updated user data',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['user', 'admin'] }
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'User updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      },
      '404': {
        description: 'User not found'
      }
    }
  })
  @ApiTags('users', 'admin')
  async updateUser(req: any, res: any) {
    const { id } = req.params;
    const userData = req.body;
    const updatedUser = await this.userService.updateUser(parseInt(id), userData);
    res.json(updatedUser);
  }

  @Delete('/:id')
  @ApiDoc({
    summary: 'Delete user',
    description: 'Deletes a user from the system',
    tags: ['users'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        schema: { type: 'number' }
      }
    ],
    responses: {
      '200': {
        description: 'User deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      },
      '404': {
        description: 'User not found'
      }
    }
  })
  @ApiTags('users', 'admin')
  async deleteUser(req: any, res: any) {
    const { id } = req.params;
    const deletedUser = await this.userService.deleteUser(parseInt(id));
    res.json(deletedUser);
  }
}

// Example of a more complex controller with different documentation patterns
@Controller('/api/admin', {
  tags: ['admin'],
  description: 'Administrative operations',
  externalDocs: {
    description: 'Admin API Documentation',
    url: 'https://admin.example.com/docs'
  }
})
class AdminController {
  @Get('/stats')
  @ApiDoc({
    summary: 'Get system statistics',
    description: 'Retrieves various system statistics and metrics',
    tags: ['admin', 'stats'],
    security: [{ name: 'bearer' }],
    responses: {
      '200': {
        description: 'Statistics retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                totalUsers: { type: 'number' },
                activeUsers: { type: 'number' },
                systemUptime: { type: 'string' },
                memoryUsage: { type: 'number' }
              }
            }
          }
        }
      },
      '401': {
        description: 'Unauthorized - valid authentication required'
      }
    }
  })
  @ApiTags('admin', 'stats')
  async getStats(req: any, res: any) {
    res.json({
      totalUsers: 150,
      activeUsers: 23,
      systemUptime: '5 days, 3 hours',
      memoryUsage: 0.75
    });
  }
}

// Main application setup
async function createApp() {
  const app = new SoapExpressApp({});
  
  // Register services
  registerClass('UserService', UserService);
  
  // Register controllers
  app.registerController(UserController);
  app.registerController(AdminController);
  
  // Add documentation endpoints
  addDocumentationEndpoints(app.getApp(), {
    info: {
      title: 'User Management API',
      description: 'A comprehensive API for managing users and administrative operations',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'users',
        description: 'User management operations'
      },
      {
        name: 'admin',
        description: 'Administrative operations'
      },
      {
        name: 'stats',
        description: 'Statistics and metrics'
      }
    ],
    basePath: '/api'
  }, {
    jsonPath: '/api-docs.json',
    yamlPath: '/api-docs.yaml',
    htmlPath: '/api-docs.html',
    interactivePath: '/docs',
    statsPath: '/api-docs/stats'
  });
  
  return app;
}

// Example usage
async function main() {
  const app = await createApp();
  
  // Start the server
  await app.start(3000);
  
  console.log('🚀 Server started on http://localhost:3000');
  console.log('📚 API Documentation available at:');
  console.log('  - Interactive: http://localhost:3000/docs');
  console.log('  - JSON: http://localhost:3000/api-docs.json');
  console.log('  - YAML: http://localhost:3000/api-docs.yaml');
  console.log('  - HTML: http://localhost:3000/api-docs.html');
  console.log('  - Stats: http://localhost:3000/api-docs/stats');
}

// Export for use in other files
export { createApp, UserController, AdminController, UserService };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
