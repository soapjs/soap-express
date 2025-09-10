import { SoapExpressApp, Controller, Post, Get, Put, Delete } from '@soapjs/soap-express';
import { 
  Injectable,
  DbQuery,
  SourceOptions,
  UpdateStats,
  RemoveStats,
  BaseCommand, 
  BaseQuery, 
  Command,
  Query,
  CommandHandler, 
  QueryHandler, 
  CommandBus, 
  QueryBus,
  EventStore,
  BaseSaga,
  Result,
  Entity,
  DomainEvent,
  BaseDomainEvent,
  ReadRepository,
  ReadWriteRepository,
  DatabaseContext,
  Source,
  Mapper,
  DI,
  Where,
  FindParams,
  UpdateParams,
  RemoveParams
} from '@soapjs/soap';
import { 
  ApiDoc, 
  addDocumentationEndpoints 
} from '../src/documentation';

// ============================================================================
// DOMAIN LAYER
// ============================================================================

// User Entity (simplified for this example)
class User implements Entity {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    public role: string,
    public createdAt: Date
  ) {}

  // Factory method
  static create(name: string, email: string, role: string): User {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new User(id, name, email, role, new Date());
  }

  // Business methods
  updateProfile(name?: string, email?: string): void {
    if (name) this.name = name;
    if (email) this.email = email;
  }

  changeRole(role: string): void {
    this.role = role;
  }
}

// User data interface
interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

// Commands
class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly role: string = 'user'
  ) {
    super();
  }
}

class UpdateUserCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly name?: string,
    public readonly email?: string,
    public readonly role?: string
  ) {
    super();
  }
}

class DeleteUserCommand extends BaseCommand {
  constructor(
    public readonly userId: string
  ) {
    super();
  }
}

// Queries
class GetUserQuery extends BaseQuery {
  constructor(
    public readonly userId: string
  ) {
    super();
  }
}

class GetUsersQuery extends BaseQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly role?: string
  ) {
    super();
  }
}

class GetUserStatsQuery extends BaseQuery {
  constructor() {
    super();
  }
}

// Domain Events
class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email: string,
    public readonly role: string,
    aggregateId: string,
    version: number = 0
  ) {
    super('UserCreated', aggregateId, {
      userId,
      name,
      email,
      role
    }, version);
  }
}

class UserUpdatedEvent extends BaseDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, any>,
    aggregateId: string,
    version: number = 0
  ) {
    super('UserUpdated', aggregateId, {
      userId,
      changes
    }, version);
  }
}

class UserDeletedEvent extends BaseDomainEvent {
  constructor(
    public readonly userId: string,
    aggregateId: string,
    version: number = 0
  ) {
    super('UserDeleted', aggregateId, {
      userId
    }, version);
  }
}

// ============================================================================
// APPLICATION LAYER - COMMAND HANDLERS
// ============================================================================

@Injectable()
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
      const existingUserResult = await this.userRepository.find(FindParams.create({where}));
      
      if (existingUserResult.isSuccess() && existingUserResult.content.length > 0) {
        return Result.withFailure(new Error('User with this email already exists'));
      }

      // Create user entity
      const user = User.create(
        command.name,
        command.email,
        command.role
      );

      // Save user using repository
      const saveResult = await this.userRepository.add([user]);
      if (saveResult.isFailure()) {
        return Result.withFailure(saveResult.failure.error);
      }

      // Create domain event for event sourcing
      const domainEvent = new UserCreatedEvent(
        user.id,
        user.name,
        user.email,
        user.role,
        user.id,
        0
      );

      // Append events to event store
      const eventResult = await this.eventStore.appendEvents(
        user.id,
        0,
        [domainEvent]
      );
      
      if (eventResult.isFailure()) {
        return Result.withFailure(eventResult.failure.error);
      }

      // Send welcome email
      await this.emailService.sendWelcomeEmail(user.email, user.name);

      return Result.withSuccess(user.id);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

@Injectable()
class UpdateUserHandler implements CommandHandler<UpdateUserCommand, void> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore
  ) {}

  async handle(command: UpdateUserCommand): Promise<Result<void>> {
    try {
      // Find user
      const where = new Where().valueOf('id').isEq(command.userId);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(new Error('User not found'));
      }

      const user = userResult.content[0];
      const changes: Record<string, any> = {};
      
      if (command.name && command.name !== user.name) {
        user.updateProfile(command.name, user.email);
        changes.name = command.name;
      }
      
      if (command.email && command.email !== user.email) {
        user.updateProfile(user.name, command.email);
        changes.email = command.email;
      }
      
      if (command.role && command.role !== user.role) {
        user.changeRole(command.role);
        changes.role = command.role;
      }

      if (Object.keys(changes).length === 0) {
        return Result.withSuccess();
      }

      // Save changes
      const updateWhere = new Where().valueOf('id').isEq(command.userId);
      const saveResult = await this.userRepository.update(UpdateParams.createUpdateOne(user, updateWhere));
      
      if (saveResult.isFailure()) {
        return Result.withFailure(saveResult.failure.error);
      }

      // Create domain event for event sourcing
      const domainEvent = new UserUpdatedEvent(
        command.userId,
        changes,
        user.id,
        0
      );

      // Append events to event store
      const eventResult = await this.eventStore.appendEvents(
        user.id,
        0,
        [domainEvent]
      );
      
      if (eventResult.isFailure()) {
        return Result.withFailure(eventResult.failure.error);
      }

      return Result.withSuccess();
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

@Injectable()
class DeleteUserHandler implements CommandHandler<DeleteUserCommand, void> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore
  ) {}

  async handle(command: DeleteUserCommand): Promise<Result<void>> {
    try {
      // Find user
      const where = new Where().valueOf('id').isEq(command.userId);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(new Error('User not found'));
      }

      const user = userResult.content[0];

      // Delete user
      const deleteWhere = new Where().valueOf('id').isEq(command.userId);
      const deleteResult = await this.userRepository.remove(new RemoveParams(deleteWhere));
      
      if (deleteResult.isFailure()) {
        return Result.withFailure(deleteResult.failure.error);
      }

      // Create domain event for event sourcing
      const domainEvent = new UserDeletedEvent(
        command.userId,
        user.id,
        0
      );

      // Append events to event store
      const eventResult = await this.eventStore.appendEvents(
        user.id,
        0,
        [domainEvent]
      );
      
      if (eventResult.isFailure()) {
        return Result.withFailure(eventResult.failure.error);
      }

      return Result.withSuccess();
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

// ============================================================================
// APPLICATION LAYER - QUERY HANDLERS
// ============================================================================

@Injectable()
class GetUserHandler implements QueryHandler<GetUserQuery, User> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User>) {}

  async handle(query: GetUserQuery): Promise<Result<User>> {
    try {
      const where = new Where().valueOf('id').isEq(query.userId);
      const userResult = await this.userRepository.find(FindParams.create({ where }));
      
      if (userResult.isFailure()) {
        return Result.withFailure(userResult.failure.error);
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

@Injectable()
class GetUsersHandler implements QueryHandler<GetUsersQuery, User[]> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User>) {}

  async handle(query: GetUsersQuery): Promise<Result<User[]>> {
    try {
      let where = new Where();
      if (query.role) {
        where = where.valueOf('role').isEq(query.role);
      }
      
      const offset = (query.page - 1) * query.limit;
      const usersResult = await this.userRepository.find(FindParams.create({ limit: query.limit, offset, where }));
      
      if (usersResult.isFailure()) {
        return Result.withFailure(usersResult.failure.error);
      }

      return Result.withSuccess(usersResult.content);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

@Injectable()
class GetUserStatsHandler implements QueryHandler<GetUserStatsQuery, { total: number; active: number; byRole: Record<string, number> }> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User>) {}

  async handle(query: GetUserStatsQuery): Promise<Result<{ total: number; active: number; byRole: Record<string, number> }>> {
    try {
      const usersResult = await this.userRepository.find(FindParams.create({}));
      if (usersResult.isFailure()) {
        return Result.withFailure(usersResult.failure.error);
      }

      const users = usersResult.content;
      const byRole: Record<string, number> = {};
      
      users.forEach(user => {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
      });
      
      const stats = {
        total: users.length,
        active: users.length, // In real app, you'd check last login date
        byRole
      };

      return Result.withSuccess(stats);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}

// ============================================================================
// INFRASTRUCTURE LAYER
// ============================================================================

// In-memory data source for demo purposes
@Injectable()
class InMemoryDataSource implements Source<any> {
  public collectionName: string;
  public options?: SourceOptions<any>;
  private data: any[] = [];

  constructor(collectionName: string, client?: any, options?: SourceOptions<any>) {
    this.collectionName = collectionName;
    this.options = options;
    // client would be used for real database connections
  }

  async find(query?: DbQuery): Promise<any[]> {
    try {
      if (!query) return this.data;
      
      // Simple filtering - in real app, you'd use proper query builder
      return this.data.filter(item => {
        const queryObj = query as any;
        if (!queryObj.where) return true;
        return Object.entries(queryObj.where).every(([key, value]) => item[key] === value);
      });
    } catch (error) {
      throw error;
    }
  }

  async count(query?: DbQuery): Promise<number> {
    try {
      if (!query) return this.data.length;
      
      const filtered = this.data.filter(item => {
        const queryObj = query as any;
        if (!queryObj.where) return true;
        return Object.entries(queryObj.where).every(([key, value]) => item[key] === value);
      });
      
      return filtered.length;
    } catch (error) {
      throw error;
    }
  }

  async aggregate<T = any>(query: DbQuery): Promise<T[]> {
    try {
      // Simple aggregation - in real app, you'd implement proper aggregation
      return this.data as T[];
    } catch (error) {
      throw error;
    }
  }

  async insert(query: DbQuery): Promise<any[]> {
    try {
      // In real app, query would contain the data to insert
      const items = (query as any).data || [];
      this.data.push(...items);
      return items;
    } catch (error) {
      throw error;
    }
  }

  async update(query: DbQuery): Promise<UpdateStats> {
    try {
      const updateData = (query as any).data || {};
      const where = (query as any).where || {};
      let modifiedCount = 0;
      
      for (let i = 0; i < this.data.length; i++) {
        const item = this.data[i];
        if (Object.entries(where).every(([key, value]) => item[key] === value)) {
          this.data[i] = { ...item, ...updateData };
          modifiedCount++;
        }
      }
      
      return {
        status: 'success',
        modifiedCount
      };
    } catch (error) {
      throw error;
    }
  }

  async remove(query: DbQuery): Promise<RemoveStats> {
    try {
      const where = (query as any).where || {};
      let deletedCount = 0;
      
      for (let i = this.data.length - 1; i >= 0; i--) {
        const item = this.data[i];
        if (Object.entries(where).every(([key, value]) => item[key] === value)) {
          this.data.splice(i, 1);
          deletedCount++;
        }
      }
      
      return {
        status: 'success',
        deletedCount
      };
    } catch (error) {
      throw error;
    }
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

  toEntity(data: any): User {
    return new User(
      data.id,
      data.name,
      data.email,
      data.role,
      data.createdAt
    );
  }
}

// Services
@Injectable()
class EmailService {
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    console.log(`📧 Sending welcome email to ${email} (${name})`);
    // In real app, you'd send actual email
  }
}

// Event Store (simplified)
@Injectable()
class InMemoryEventStore implements EventStore {
  private events = new Map<string, DomainEvent[]>();

  async appendEvents(aggregateId: string, expectedVersion: number, events: DomainEvent[]): Promise<Result<void>> {
    try {
      const existingEvents = this.events.get(aggregateId) || [];
      if (existingEvents.length !== expectedVersion) {
        return Result.withFailure(new Error('Concurrency conflict'));
      }
      
      this.events.set(aggregateId, [...existingEvents, ...events]);
      return Result.withSuccess();
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }

  async getEvents(aggregateId: string): Promise<Result<DomainEvent[]>> {
    return Result.withSuccess(this.events.get(aggregateId) || []);
  }

  async getEventsFromVersion(aggregateId: string, fromVersion: number): Promise<Result<DomainEvent[]>> {
    const events = this.events.get(aggregateId) || [];
    return Result.withSuccess(events.slice(fromVersion));
  }

  async getEventsByType(eventType: string): Promise<Result<DomainEvent[]>> {
    const allEvents: DomainEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return Result.withSuccess(allEvents.filter(event => event.type === eventType));
  }

  async getEventsByCorrelationId(correlationId: string): Promise<Result<DomainEvent[]>> {
    const allEvents: DomainEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return Result.withSuccess(allEvents.filter(event => 
      event.metadata?.correlationId === correlationId
    ));
  }

  async getEventsInTimeRange(fromDate: Date, toDate: Date): Promise<Result<DomainEvent[]>> {
    const allEvents: DomainEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return Result.withSuccess(allEvents.filter(event => 
      event.timestamp >= fromDate && event.timestamp <= toDate
    ));
  }
}

// ============================================================================
// CQRS BUSES
// ============================================================================

@Injectable()
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

@Injectable()
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
// SAGA EXAMPLE
// ============================================================================

class UserRegistrationSaga extends BaseSaga {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string
  ) {
    const steps = [
      {
        stepId: 'create-user',
        name: 'Create User',
        command: new CreateUserCommand(name, email, 'user'),
        completed: false,
        compensated: false
      },
      {
        stepId: 'send-welcome-email',
        name: 'Send Welcome Email',
        command: new CreateUserCommand(name, email, 'user'), // Simplified
        completed: false,
        compensated: false
      }
    ];
    
    super('UserRegistrationSaga', steps);
  }

  async executeNextStep(): Promise<Result<void>> {
    // Saga implementation would go here
    return Result.withSuccess();
  }

  async compensate(): Promise<Result<void>> {
    // Compensation logic would go here
    return Result.withSuccess();
  }

  async complete(): Promise<Result<void>> {
    // Completion logic would go here
    return Result.withSuccess();
  }

  async fail(error: Error): Promise<Result<void>> {
    // Failure handling would go here
    return Result.withSuccess();
  }
}

// ============================================================================
// CONTROLLERS WITH CQRS INTEGRATION
// ============================================================================

@Controller('/api/users', {
  apiDoc: {
    tags: ['users'],
    description: 'User management with CQRS pattern'
  }
})
class UserController {
  constructor(
    @Inject('CommandBus') private commandBus: CommandBus,
    @Inject('QueryBus') private queryBus: QueryBus
  ) {}

  @Post('/')
  @ApiDoc({
    summary: 'Create user',
    description: 'Creates a new user using CQRS command',
    tags: ['users'],
    requestBody: {
      description: 'User creation data',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email'],
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
                success: { type: 'boolean' },
                data: { type: 'object' },
                message: { type: 'string' }
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
  async createUser(req: any, res: any) {
    const { name, email, role = 'user' } = req.body;
    
    const command = new CreateUserCommand(name, email, role);
    const result = await this.commandBus.dispatch(command);
    
    if (result.isSuccess()) {
      res.status(201).json({
        success: true,
        data: { userId: result.content },
        message: 'User created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.failure.error.message,
        message: 'Failed to create user'
      });
    }
  }

  @Get('/:id')
  @ApiDoc({
    summary: 'Get user by ID',
    description: 'Retrieves a user using CQRS query',
    tags: ['users'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        schema: { type: 'string' }
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
                success: { type: 'boolean' },
                data: { type: 'object' }
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
    summary: 'Get all users',
    description: 'Retrieves users with pagination using CQRS query',
    tags: ['users'],
    parameters: [
      {
        name: 'page',
        in: 'query',
        description: 'Page number',
        schema: { type: 'number', default: 1 }
      },
      {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: { type: 'number', default: 10 }
      },
      {
        name: 'role',
        in: 'query',
        description: 'Filter by role',
        schema: { type: 'string' }
      }
    ],
    responses: {
      '200': {
        description: 'Users retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'array',
                  items: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
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
    description: 'Updates a user using CQRS command',
    tags: ['users'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        schema: { type: 'string' }
      }
    ],
    requestBody: {
      description: 'User update data',
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
        description: 'User updated successfully'
      },
      '404': {
        description: 'User not found'
      }
    }
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
    description: 'Deletes a user using CQRS command',
    tags: ['users'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      '200': {
        description: 'User deleted successfully'
      },
      '404': {
        description: 'User not found'
      }
    }
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
// STATS CONTROLLER
// ============================================================================

@Controller('/api/stats', {
  apiDoc: {
    tags: ['stats'],
    description: 'Statistics and analytics'
  }
})
class StatsController {
  constructor(@Inject('QueryBus') private queryBus: QueryBus) {}

  @Get('/users')
  @ApiDoc({
    summary: 'Get user statistics',
    description: 'Retrieves user statistics using CQRS query',
    tags: ['stats'],
    responses: {
      '200': {
        description: 'Statistics retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    byRole: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async getUserStats(req: any, res: any) {
    const query = new GetUserStatsQuery();
    const result = await this.queryBus.dispatch(query);
    
    if (result.isSuccess()) {
      res.json({
        success: true,
        data: result.content
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.failure!.error,
        message: 'Failed to retrieve statistics'
      });
    }
  }
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

async function createApp() {
  const app = new SoapExpressApp({});
  
  // Create infrastructure components
  const dataSource = new InMemoryDataSource('users', null, { modelClass: Object });
  const mapper = new UserMapper();
  const sessionRegistry = new DatabaseSessionRegistry();
  const context = new DatabaseContext(dataSource, mapper, sessionRegistry);
  
  // Create repositories
  const userRepository = new ReadWriteRepository<User, any>(context);
  const userReadRepository = new ReadRepository<User>(context);
  
  // Register infrastructure services using DI
  DI.registerValue('UserRepository', userRepository);
  DI.registerValue('UserReadRepository', userReadRepository);
  DI.registerClass(EmailService);
  DI.registerClass(InMemoryEventStore);
  DI.registerClass(InMemoryCommandBus);
  DI.registerClass(InMemoryQueryBus);
  
  // Register command handlers
  DI.registerClass(CreateUserHandler);
  DI.registerClass(UpdateUserHandler);
  DI.registerClass(DeleteUserHandler);
  
  // Register query handlers
  DI.registerClass(GetUserHandler);
  DI.registerClass(GetUsersHandler);
  DI.registerClass(GetUserStatsHandler);
  
  // Register controllers
  app.registerController(UserController);
  app.registerController(StatsController);
  
  // Setup CQRS buses
  const commandBus = DI.get<InMemoryCommandBus>('InMemoryCommandBus');
  const queryBus = DI.get<InMemoryQueryBus>('InMemoryQueryBus');
  
  // Register command handlers with bus
  commandBus.register(CreateUserCommand, DI.get<CreateUserHandler>('CreateUserHandler'));
  commandBus.register(UpdateUserCommand, DI.get<UpdateUserHandler>('UpdateUserHandler'));
  commandBus.register(DeleteUserCommand, DI.get<DeleteUserHandler>('DeleteUserHandler'));
  
  // Register query handlers with bus
  queryBus.register(GetUserQuery, DI.get<GetUserHandler>('GetUserHandler'));
  queryBus.register(GetUsersQuery, DI.get<GetUsersHandler>('GetUsersHandler'));
  queryBus.register(GetUserStatsQuery, DI.get<GetUserStatsHandler>('GetUserStatsHandler'));
  
  // Add documentation endpoints
  addDocumentationEndpoints(app.getApp(), {
    info: {
      title: 'CQRS User Management API',
      description: 'A comprehensive API demonstrating CQRS pattern with Express.js using @soapjs/soap',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'users',
        description: 'User management operations using CQRS'
      },
      {
        name: 'stats',
        description: 'Statistics and analytics'
      }
    ],
    basePath: '/api'
  });
  
  return app;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const app = await createApp();
  
  // Start the server
  await app.start(3000);
  
  console.log('🚀 CQRS Server started on http://localhost:3000');
  console.log('📚 API Documentation available at:');
  console.log('  - Interactive: http://localhost:3000/docs');
  console.log('  - JSON: http://localhost:3000/api-docs.json');
  console.log('  - YAML: http://localhost:3000/api-docs.yaml');
  console.log('  - HTML: http://localhost:3000/api-docs.html');
  console.log('');
  console.log('🔧 CQRS Endpoints:');
  console.log('  - POST /api/users - Create user (Command)');
  console.log('  - GET /api/users/:id - Get user (Query)');
  console.log('  - GET /api/users - Get users (Query)');
  console.log('  - PUT /api/users/:id - Update user (Command)');
  console.log('  - DELETE /api/users/:id - Delete user (Command)');
  console.log('  - GET /api/stats/users - Get user stats (Query)');
  console.log('');
  console.log('💡 Example requests:');
  console.log('  curl -X POST http://localhost:3000/api/users \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"name": "John Doe", "email": "john@example.com"}\'');
  console.log('');
  console.log('  curl http://localhost:3000/api/users');
  console.log('  curl http://localhost:3000/api/stats/users');
}

// Export for use in other files
export { 
  createApp, 
  UserController, 
  StatsController,
  CreateUserCommand,
  UpdateUserCommand,
  DeleteUserCommand,
  GetUserQuery,
  GetUsersQuery,
  GetUserStatsQuery,
  User,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRegistrationSaga
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
