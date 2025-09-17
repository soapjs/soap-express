# CQRS Decorators

CQRS (Command Query Responsibility Segregation) decorators provide a clean and declarative way to implement CQRS patterns in your Express.js applications using `@soapjs/soap-express`.

## Table of Contents

- [Overview](#overview)
- [Command Decorators](#command-decorators)
- [Query Decorators](#query-decorators)
- [Event Decorators](#event-decorators)
- [Bus Decorators](#bus-decorators)
- [Complete Example](#complete-example)
- [Best Practices](#best-practices)

## Overview

CQRS decorators automatically handle:
- **Dependency Injection** - Automatic registration in DI container
- **Bus Registration** - Automatic registration with Command/Query buses
- **Type Safety** - Full TypeScript support
- **Metadata Management** - Automatic metadata collection

## Command Decorators

### `@Command(commandType)`

Decorator for Command Handlers. Automatically registers the handler with the CommandBus.

```typescript
import { Command, CommandHandler } from '@soapjs/soap';
import { Command as CommandDecorator } from '@soapjs/soap-express';

class CreateUserCommand extends BaseCommand<string> {
  constructor(
    public name: string,
    public email: string,
    public role: string = 'user'
  ) {
    super();
  }
}

@CommandDecorator(CreateUserCommand)
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore
  ) {}

  async handle(command: CreateUserCommand): Promise<Result<string>> {
    // Command handling logic
    const user = new User(/* ... */);
    await this.userRepository.add([user]);
    
    const event = new UserCreatedEvent(user.id, user.name, user.email);
    await this.eventStore.save(event);
    
    return Result.withSuccess(user.id);
  }
}
```

### `@CommandHandler(commandType, options?)`

Extended decorator with additional options:

```typescript
@CommandHandler(CreateUserCommand, {
  token: 'CustomCreateUserHandler',
  scope: Scope.SINGLETON
})
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  // ...
}
```

**Options:**
- `token?: string` - Custom DI token
- `scope?: Scope` - DI scope (SINGLETON, TRANSIENT, REQUEST)

## Query Decorators

### `@Query(queryType)`

Decorator for Query Handlers. Automatically registers the handler with the QueryBus.

```typescript
import { Query, QueryHandler } from '@soapjs/soap';
import { Query as QueryDecorator } from '@soapjs/soap-express';

class GetUserQuery extends BaseQuery<User> {
  constructor(public userId: string) {
    super();
  }
}

@QueryDecorator(GetUserQuery)
class GetUserHandler implements QueryHandler<GetUserQuery, User> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User, any>) {}

  async handle(query: GetUserQuery): Promise<Result<User>> {
    const where = new Where().valueOf('id').isEq(query.userId);
    const userResult = await this.userRepository.find(FindParams.create({ where }));
    
    if (userResult.isFailure() || userResult.content.length === 0) {
      return Result.withFailure(new Error('User not found'));
    }
    
    return Result.withSuccess(userResult.content[0]);
  }
}
```

### `@QueryHandler(queryType, options?)`

Extended decorator with additional options:

```typescript
@QueryHandler(GetUserQuery, {
  token: 'CustomGetUserHandler',
  scope: Scope.SINGLETON
})
class GetUserHandler implements QueryHandler<GetUserQuery, User> {
  // ...
}
```

## Event Decorators

### `@EventHandler(eventType)`

Decorator for Event Handlers. Automatically registers the handler with the EventBus.

```typescript
import { DomainEvent } from '@soapjs/soap';
import { EventHandler } from '@soapjs/soap-express';

class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    public userId: string,
    public name: string,
    public email: string
  ) {
    super();
  }
}

@EventHandler(UserCreatedEvent)
class UserCreatedHandler {
  constructor(@Inject('EmailService') private emailService: EmailService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    console.log(`User created: ${event.name} (${event.email})`);
    await this.emailService.sendWelcomeEmail(event.email, event.name);
  }
}
```

### `@EventHandler(eventType, options?)`

Extended decorator with additional options:

```typescript
@EventHandler(UserCreatedEvent, {
  token: 'CustomUserCreatedHandler',
  scope: Scope.SINGLETON
})
class UserCreatedHandler {
  // ...
}
```

## Bus Decorators

### `@CommandBus(options?)`

Decorator for Command Bus. Automatically registers the bus in DI container.

```typescript
import { CommandBus } from '@soapjs/soap';
import { CommandBus as CommandBusDecorator } from '@soapjs/soap-express';

@CommandBusDecorator()
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
```

### `@QueryBus(options?)`

Decorator for Query Bus. Automatically registers the bus in DI container.

```typescript
import { QueryBus } from '@soapjs/soap';
import { QueryBus as QueryBusDecorator } from '@soapjs/soap-express';

@QueryBusDecorator()
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
```

## Complete Example

Here's a complete example showing how to use all CQRS decorators:

```typescript
import { SoapExpressApp, Controller, Post, Get } from '@soapjs/soap-express';
import { 
  Command as CommandDecorator,
  Query as QueryDecorator,
  EventHandler,
  CommandBus as CommandBusDecorator,
  QueryBus as QueryBusDecorator
} from '@soapjs/soap-express';

// Commands
class CreateUserCommand extends BaseCommand<string> {
  constructor(public name: string, public email: string) {
    super();
  }
}

// Queries
class GetUserQuery extends BaseQuery<User> {
  constructor(public userId: string) {
    super();
  }
}

// Events
class UserCreatedEvent extends BaseDomainEvent {
  constructor(public userId: string, public name: string) {
    super();
  }
}

// Command Handler
@CommandDecorator(CreateUserCommand)
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore
  ) {}

  async handle(command: CreateUserCommand): Promise<Result<string>> {
    // Implementation
  }
}

// Query Handler
@QueryDecorator(GetUserQuery)
class GetUserHandler implements QueryHandler<GetUserQuery, User> {
  constructor(@Inject('UserReadRepository') private userRepository: ReadRepository<User, any>) {}

  async handle(query: GetUserQuery): Promise<Result<User>> {
    // Implementation
  }
}

// Event Handler
@EventHandler(UserCreatedEvent)
class UserCreatedHandler {
  async handle(event: UserCreatedEvent): Promise<void> {
    console.log(`User created: ${event.name}`);
  }
}

// Command Bus
@CommandBusDecorator()
class InMemoryCommandBus implements CommandBus {
  // Implementation
}

// Query Bus
@QueryBusDecorator()
class InMemoryQueryBus implements QueryBus {
  // Implementation
}

// Controller
@Controller('/api/users')
class UserController {
  constructor(
    @Inject('CommandBus') private commandBus: CommandBus,
    @Inject('QueryBus') private queryBus: QueryBus
  ) {}

  @Post('/')
  async createUser(req: any, res: any) {
    const { name, email } = req.body;
    const command = new CreateUserCommand(name, email);
    const result = await this.commandBus.dispatch(command);
    
    if (result.isSuccess()) {
      res.status(201).json({ success: true, data: { id: result.content } });
    } else {
      res.status(400).json({ success: false, error: result.failure!.error.message });
    }
  }

  @Get('/:id')
  async getUserById(req: any, res: any) {
    const { id } = req.params;
    const query = new GetUserQuery(id);
    const result = await this.queryBus.dispatch(query);
    
    if (result.isSuccess()) {
      res.json({ success: true, data: result.content });
    } else {
      res.status(404).json({ success: false, error: result.failure!.error.message });
    }
  }
}
```

## Best Practices

### 1. Use Descriptive Names

```typescript
// ✅ Good
@CommandDecorator(CreateUserCommand)
class CreateUserHandler { }

// ❌ Avoid
@CommandDecorator(CreateUserCommand)
class Handler { }
```

### 2. Keep Handlers Focused

```typescript
// ✅ Good - Single responsibility
@CommandDecorator(CreateUserCommand)
class CreateUserHandler {
  async handle(command: CreateUserCommand): Promise<Result<string>> {
    // Only user creation logic
  }
}

// ❌ Avoid - Multiple responsibilities
@CommandDecorator(CreateUserCommand)
class UserHandler {
  async handle(command: CreateUserCommand): Promise<Result<string>> {
    // User creation + email sending + logging + analytics
  }
}
```

### 3. Use Proper Error Handling

```typescript
@CommandDecorator(CreateUserCommand)
class CreateUserHandler {
  async handle(command: CreateUserCommand): Promise<Result<string>> {
    try {
      // Business logic
      return Result.withSuccess(userId);
    } catch (error) {
      return Result.withFailure(error as Error);
    }
  }
}
```

### 4. Leverage Dependency Injection

```typescript
@CommandDecorator(CreateUserCommand)
class CreateUserHandler {
  constructor(
    @Inject('UserRepository') private userRepository: ReadWriteRepository<User, any>,
    @Inject('EventStore') private eventStore: EventStore,
    @Inject('EmailService') private emailService: EmailService
  ) {}
}
```

### 5. Use Events for Side Effects

```typescript
@CommandDecorator(CreateUserCommand)
class CreateUserHandler {
  async handle(command: CreateUserCommand): Promise<Result<string>> {
    // Create user
    const user = await this.userRepository.add([newUser]);
    
    // Publish event for side effects
    const event = new UserCreatedEvent(user.id, user.name, user.email);
    await this.eventStore.save(event);
    
    return Result.withSuccess(user.id);
  }
}

@EventHandler(UserCreatedEvent)
class UserCreatedHandler {
  async handle(event: UserCreatedEvent): Promise<void> {
    // Send welcome email
    // Update analytics
    // Send notifications
  }
}
```

## Benefits

1. **Less Boilerplate** - Automatic registration and setup
2. **Better DX** - Clean, declarative API
3. **Type Safety** - Full TypeScript support
4. **Consistency** - Standardized patterns across the application
5. **Maintainability** - Clear separation of concerns
6. **Testability** - Easy to mock and test individual components

## Migration from Manual Setup

If you're migrating from manual CQRS setup, the decorators provide a drop-in replacement:

```typescript
// Before (Manual)
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  // ...
}

// Register manually with old DI system
DI.registerClass(CreateUserHandler, 'CommandHandler:CreateUserCommand');
commandBus.register(CreateUserCommand, new CreateUserHandler(/* deps */));

// After (With Decorators and new DI system)
@CommandDecorator(CreateUserCommand)
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  // ...
}

// Automatic registration using DI.bind().toClass()!
```

## New DI System Integration

The CQRS decorators now use the new `@soapjs/soap` DI system:

```typescript
// Old way (deprecated)
DI.registerClass(handler, token, { scope: Scope.SINGLETON });

// New way (automatic with decorators)
DI.bind(token).toClass(handler, { scope: Scope.SINGLETON });
```

The decorators automatically handle the new DI registration pattern, making your code cleaner and more maintainable.
