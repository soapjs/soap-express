import { SoapExpressApp, Controller, Post, Get, Put, Delete } from '@soapjs/soap-express';
import  from '@soapjs/soap';
import { 
  Command as CqrsCommand,
  Query as CqrsQuery,
  EventHandler,
  CommandBus as CqrsCommandBus,
  QueryBus as CqrsQueryBus
} from '@soapjs/soap-express';
import { Entity, BaseCommand, BaseQuery, BaseDomainEvent, CommandHandler, ReadWriteRepository, EventStore, Result, Where, FindParams, UpdateParams, RemoveParams, QueryHandler, ReadRepository, Injectable, Source, SourceOptions, UpdateStats, RemoveStats, Mapper, DomainEvent, CommandBus, QueryBus, Query, DatabaseContext, DI } from '@soapjs/soap';
import { ApiDoc, addDocumentationEndpoints } from '../src/documentation';

// ============================================================================
// DOMAIN LAYER
// ============================================================================

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export class User implements Entity {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public role: string,
    public createdAt: Date
  ) {}
}

// Commands
export class CreateUserCommand extends BaseCommand<string> {
  constructor(
    public name: string,
    public email: string,
    public role: string = 'user'
  ) {
    super();
  }
}

export class UpdateUserCommand extends BaseCommand<void> {
  constructor(
    public userId: string,
    public name?: string,
    public email?: string,
    public role?: string
  ) {
    super();
  }
}

export class DeleteUserCommand extends BaseCommand<void> {
  constructor(public userId: string) {
    super();
  }
}

// Queries
export class GetUserQuery extends BaseQuery<User> {
  constructor(public userId: string) {
    super();
  }
}

export class GetUsersQuery extends BaseQuery<User[]> {
  constructor(
    public page: number = 1,
    public limit: number = 10,
    public role?: string
  ) {
    super();
  }
}

// Domain Events
export class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    public userId: string,
    public name: string,
    public email: string,
    public role: string
  ) {
    super();
  }
}

export class UserUpdatedEvent extends BaseDomainEvent {
  constructor(
    public userId: string,
    public changes: Record<string, any>
  ) {
    super();
  }
}

export class UserDeletedEvent extends BaseDomainEvent {
  constructor(public userId: string) {
    super();
  }
}

// ============================================================================
// APPLICATION LAYER - COMMAND HANDLERS
// ============================================================================

@CqrsCommand(CreateUserCommand)
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore,
    @Inject('EmailService') private emailService: EmailService
  ) {}

  async handle(command: CreateUserCommand): Promise<Result<string>> {
    try {
      // Check if user already exists
      const where = new Where().valueOf('email').isEq(command.email);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(new Error('User not found'));
      }

      if (userResult.content.length > 0) {
        return Result.withFailure(new Error('User already exists'));
      }

      // Create new user
      const user = new User(
        Date.now().toString(),
        command.name,
        command.email,
        command.role,
        new Date()
      );

      const addResult = await this.userRepository.add([user]);
      if (addResult.isFailure()) {
        return Result.withFailure(addResult.failure!.error);
      }

      // Publish event
      const event = new UserCreatedEvent(user.id, user.name, user.email, user.role);
      await this.eventStore.save(event);

      // Send welcome email
      await this.emailService.sendWelcomeEmail(user.email, user.name);

      return Result.withSuccess(user.id);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

@CqrsCommand(UpdateUserCommand)
class UpdateUserHandler implements CommandHandler<UpdateUserCommand, void> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore
  ) {}

  async handle(command: UpdateUserCommand): Promise<Result<void>> {
    try {
      const where = new Where().valueOf('id').isEq(command.userId);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(new Error('User not found'));
      }

      if (userResult.content.length === 0) {
        return Result.withFailure(new Error('User not found'));
      }

      const user = userResult.content[0];
      const changes: Record<string, any> = {};
      
      if (command.name !== undefined) changes.name = command.name;
      if (command.email !== undefined) changes.email = command.email;
      if (command.role !== undefined) changes.role = command.role;

      if (Object.keys(changes).length === 0) {
        return Result.withSuccess(undefined);
      }

      const updateResult = await this.userRepository.update(
        UpdateParams.createUpdateOne(where, changes)
      );

      if (updateResult.isFailure()) {
        return Result.withFailure(updateResult.failure!.error);
      }

      // Publish event
      const event = new UserUpdatedEvent(command.userId, changes);
      await this.eventStore.save(event);

      return Result.withSuccess(undefined);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

@CqrsCommand(DeleteUserCommand)
class DeleteUserHandler implements CommandHandler<DeleteUserCommand, void> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore
  ) {}

  async handle(command: DeleteUserCommand): Promise<Result<void>> {
    try {
      const where = new Where().valueOf('id').isEq(command.userId);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(new Error('User not found'));
      }

      if (userResult.content.length === 0) {
        return Result.withFailure(new Error('User not found'));
      }

      // Delete user
      const deleteResult = await this.userRepository.remove(RemoveParams.create(where));
      if (deleteResult.isFailure()) {
        return Result.withFailure(deleteResult.failure!.error);
      }

      // Publish event
      const event = new UserDeletedEvent(command.userId);
      await this.eventStore.save(event);

      return Result.withSuccess(undefined);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

// ============================================================================
// APPLICATION LAYER - QUERY HANDLERS
// ============================================================================

@CqrsQuery(GetUserQuery)
class GetUserHandler implements QueryHandler<GetUserQuery, User> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User, any>) {}

  async handle(query: GetUserQuery): Promise<Result<User>> {
    try {
      const where = new Where().valueOf('id').isEq(query.userId);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(userResult.failure!.error);
      }

      if (userResult.content.length === 0) {
        return Result.withFailure(new Error('User not found'));
      }
      
      return Result.withSuccess(userResult.content[0]);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

@CqrsQuery(GetUsersQuery)
class GetUsersHandler implements QueryHandler<GetUsersQuery, User[]> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User, any>) {}

  async handle(query: GetUsersQuery): Promise<Result<User[]>> {
    try {
      const where = new Where();
      if (query.role) {
        where.valueOf('role').isEq(query.role);
      }

      const findParams = FindParams.create({
        where,
        limit: query.limit,
        offset: (query.page - 1) * query.limit
      });

      const usersResult = await this.userRepository.find(findParams);
      
      if (usersResult.isFailure()) {
        return Result.withFailure(usersResult.failure!.error);
      }

      return Result.withSuccess(usersResult.content);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

// ============================================================================
// APPLICATION LAYER - EVENT HANDLERS
// ============================================================================

@EventHandler(UserCreatedEvent)
class UserCreatedHandler {
  constructor(@Inject('EmailService') private emailService: EmailService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    console.log(`User created: ${event.name} (${event.email})`);
    // Additional logic like sending notifications, updating analytics, etc.
  }
}

@EventHandler(UserUpdatedEvent)
class UserUpdatedHandler {
  async handle(event: UserUpdatedEvent): Promise<void> {
    console.log(`User updated: ${event.userId}`, event.changes);
    // Additional logic like audit logging, cache invalidation, etc.
  }
}

@EventHandler(UserDeletedEvent)
class UserDeletedHandler {
  async handle(event: UserDeletedEvent): Promise<void> {
    console.log(`User deleted: ${event.userId}`);
    // Additional logic like cleanup, notifications, etc.
  }
}

// ============================================================================
// INFRASTRUCTURE LAYER
// ============================================================================

// In-memory data source for demo purposes
@Injectable()
class InMemoryDataSource implements Source<any> {
  public collectionName: string;
  private data: any[] = [];

  constructor(collectionName: string, client?: any, options?: SourceOptions<any>) {
    this.collectionName = collectionName;
  }

  async find(params?: FindParams): Promise<any[]> {
    let results = [...this.data];
    
    if (params?.where) {
      // Simple filtering - in real implementation, use proper query engine
      const whereClause = params.where;
      // This is simplified - real implementation would parse Where clause
      results = results.filter(item => {
        // Basic filtering logic
        return true;
      });
    }

    if (params?.limit) {
      results = results.slice(0, params.limit);
    }

    if (params?.offset) {
      results = results.slice(params.offset);
    }

    return results;
  }

  async count(params?: FindParams): Promise<number> {
    const results = await this.find(params);
    return results.length;
  }

  async aggregate<ResultType = any>(params: any): Promise<ResultType> {
    // Simplified aggregation
    return this.data as ResultType;
  }

  async insert(documents: any[]): Promise<any[]> {
    this.data.push(...documents);
    return documents;
  }

  async update(params: UpdateParams): Promise<UpdateStats> {
    // Simplified update
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async remove(params: RemoveParams): Promise<RemoveStats> {
    // Simplified remove
    return { deletedCount: 1 };
  }
}

// Simple mapper for User entity
@Injectable()
class UserMapper implements Mapper<User, any> {
  toModel(entity: User): any {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
      createdAt: entity.createdAt
    };
  }

  toEntity(model: any): User {
    return new User(
      model.id,
      model.name,
      model.email,
      model.role,
      model.createdAt
    );
  }
}

// Services
@Injectable()
class EmailService {
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    console.log(`Sending welcome email to ${email} for ${name}`);
  }
}

// Event Store (simplified)
@Injectable()
class InMemoryEventStore implements EventStore {
  private events = new Map<string, DomainEvent[]>();

  async save(event: DomainEvent): Promise<void> {
    const eventType = event.constructor.name;
    if (!this.events.has(eventType)) {
      this.events.set(eventType, []);
    }
    this.events.get(eventType)!.push(event);
  }

  async getEvents(eventType: string): Promise<DomainEvent[]> {
    return this.events.get(eventType) || [];
  }
}

// ============================================================================
// CQRS BUSES
// ============================================================================

@CqrsCommandBus()
class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();

  register<TCommand extends Command<TResult>, TResult>(
    commandType: new (...args: any[]) => TCommand,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(commandType.name, handler);
  }

  async dispatch<TResult>(command: Command<TResult>): Promise<Result<TResult>> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      return Result.withFailure(new Error(`No handler found for command: ${command.constructor.name}`));
    }
    
    return await handler.handle(command);
  }
}

@CqrsQueryBus()
class InMemoryQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>();

  register<TQuery extends Query<TResult>, TResult>(
    queryType: new (...args: any[]) => TQuery,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType.name, handler);
  }

  async dispatch<TResult>(query: Query<TResult>): Promise<Result<TResult>> {
    const handler = this.handlers.get(query.constructor.name);
    if (!handler) {
      return Result.withFailure(new Error(`No handler found for query: ${query.constructor.name}`));
    }
    
    return await handler.handle(query);
  }
}

// ============================================================================
// CONTROLLERS WITH CQRS INTEGRATION
// ============================================================================

@Controller('/api/users', {
  apiDoc: {
    tags: ['users'],
    description: 'User management with CQRS pattern using decorators'
  }
})
class UserController {
  constructor(
    @Inject('CommandBus') private commandBus: CommandBus,
    @Inject('QueryBus') private queryBus: QueryBus
  ) {}

  @Post('/')
  @ApiDoc({
    summary: 'Create a new user',
    description: 'Creates a new user with the provided data'
  })
  async createUser(req: any, res: any) {
    const { name, email, role = 'user' } = req.body;
    
    const command = new CreateUserCommand(name, email, role);
    const result = await this.commandBus.dispatch(command);
    
    if (result.isSuccess()) {
      res.status(201).json({
        success: true,
        data: { id: result.content }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.failure!.error.message,
        message: 'Failed to create user'
      });
    }
  }

  @Get('/:id')
  @ApiDoc({
    summary: 'Get user by ID',
    description: 'Retrieves a user by their ID'
  })
  async getUserById(req: any, res: any) {
    const { id } = req.params;
    
    const query = new GetUserQuery(id);
    const result = await this.queryBus.dispatch<{data: User}>(query);
    
    if (result.isSuccess()) {
      res.json({
        success: true,
        data: {
          id: result.content.data.id,
          name: result.content.data.name,
          email: result.content.data.email,
          role: result.content.data.role,
          createdAt: result.content.data.createdAt
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.failure!.error,
        message: 'User not found'
      });
    }
  }

  @Get('/')
  @ApiDoc({
    summary: 'Get users',
    description: 'Retrieves a list of users with pagination'
  })
  async getUsers(req: any, res: any) {
    const { page = 1, limit = 10, role } = req.query;
    
    const query = new GetUsersQuery(parseInt(page), parseInt(limit), role);
    const result = await this.queryBus.dispatch<{data: User[]}>(query);
    
    if (result.isSuccess()) {
      res.json({
        success: true,
        data: result.content.data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }))
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.failure!.error,
        message: 'Failed to retrieve users'
      });
    }
  }

  @Put('/:id')
  @ApiDoc({
    summary: 'Update user',
    description: 'Updates an existing user'
  })
  async updateUser(req: any, res: any) {
    const { id } = req.params;
    const { name, email, role } = req.body;
    
    const command = new UpdateUserCommand(id, name, email, role);
    const result = await this.commandBus.dispatch(command);
    
    if (result.isSuccess()) {
      res.json({
        success: true,
        message: 'User updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.failure!.error,
        message: 'Failed to update user'
      });
    }
  }

  @Delete('/:id')
  @ApiDoc({
    summary: 'Delete user',
    description: 'Deletes a user by ID'
  })
  async deleteUser(req: any, res: any) {
    const { id } = req.params;
    
    const command = new DeleteUserCommand(id);
    const result = await this.commandBus.dispatch(command);
    
    if (result.isSuccess()) {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.failure!.error.message,
        message: 'Failed to delete user'
      });
    }
  }
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

async function createApp() {
  const app = new SoapExpressApp();

  // Register infrastructure
  const userSource = new InMemoryDataSource('users');
  const userMapper = new UserMapper();
  const userContext = new DatabaseContext(userSource, userMapper);
  const userRepository = new ReadWriteRepository(userContext);
  const userReadRepository = new ReadRepository(userContext);

  const emailService = new EmailService();
  const eventStore = new InMemoryEventStore();
  const commandBus = new InMemoryCommandBus();
  const queryBus = new InMemoryQueryBus();

  // Register in DI
  DI.registerValue('UserRepository', userRepository);
  DI.registerValue('UserReadRepository', userReadRepository);
  DI.registerValue('EmailService', emailService);
  DI.registerValue('EventStore', eventStore);
  DI.registerValue('CommandBus', commandBus);
  DI.registerValue('QueryBus', queryBus);

  // Register handlers with buses
  const createUserHandler = new CreateUserHandler(userRepository, eventStore, emailService);
  const updateUserHandler = new UpdateUserHandler(userRepository, eventStore);
  const deleteUserHandler = new DeleteUserHandler(userRepository, eventStore);
  const getUserHandler = new GetUserHandler(userReadRepository);
  const getUsersHandler = new GetUsersHandler(userReadRepository);

  commandBus.register(CreateUserCommand, createUserHandler);
  commandBus.register(UpdateUserCommand, updateUserHandler);
  commandBus.register(DeleteUserCommand, deleteUserHandler);
  queryBus.register(GetUserQuery, getUserHandler);
  queryBus.register(GetUsersQuery, getUsersHandler);

  // Register controllers
  app.registerController(UserController);

  // Add documentation endpoints
  addDocumentationEndpoints(app, {
    title: 'CQRS API with Decorators',
    version: '1.0.0',
    description: 'API demonstrating CQRS pattern with decorators'
  });

  return app;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Domain
  User,
  CreateUserCommand,
  UpdateUserCommand,
  DeleteUserCommand,
  GetUserQuery,
  GetUsersQuery,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  
  // Handlers
  CreateUserHandler,
  UpdateUserHandler,
  DeleteUserHandler,
  GetUserHandler,
  GetUsersHandler,
  UserCreatedHandler,
  UserUpdatedHandler,
  UserDeletedHandler,
  
  // Infrastructure
  InMemoryDataSource,
  UserMapper,
  EmailService,
  InMemoryEventStore,
  InMemoryCommandBus,
  InMemoryQueryBus,
  
  // Controllers
  UserController,
  
  // App
  createApp
};
