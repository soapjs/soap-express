# 🔧 Dependency Injection System

The `@soapjs/soap-express` framework uses the powerful dependency injection system from `@soapjs/soap` 0.6.5, providing a modern, type-safe, and flexible way to manage dependencies in your Express.js applications.

## 📋 Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [DI Container](#di-container)
- [Binding Types](#binding-types)
- [Scopes](#scopes)
- [Dependency Resolution](#dependency-resolution)
- [Decorators](#decorators)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## 🎯 Overview

The dependency injection system provides:

- **Type Safety**: Full TypeScript support with compile-time checking
- **Flexible Binding**: Multiple binding types (class, value, factory, interface)
- **Scope Management**: Singleton, transient, and request scopes
- **Automatic Resolution**: Automatic dependency resolution with decorators
- **Circular Dependency Detection**: Built-in protection against circular dependencies
- **Performance**: Optimized for high-performance applications

## 🚀 Basic Usage

### 1. Using the DI Container

```typescript
import { SoapExpressApp } from '@soapjs/soap-express';
import { DI } from '@soapjs/soap';

const app = new SoapExpressApp();

// Bind a class
DI.bind('UserService').toClass(UserService);

// Bind a value
DI.bind('API_KEY').toValue('your-api-key');

// Bind a factory
DI.bind('Database').toFactory(() => new Database());

// Get a service
const userService = DI.get('UserService');
```

### 2. Using Decorators

```typescript
import { Injectable, Inject } from '@soapjs/soap';

@Injectable()
export class UserService {
  constructor(
    @Inject('Database') private database: Database,
    @Inject('Logger') private logger: Logger
  ) {}
}

@Injectable()
export class UserController {
  constructor(
    @Inject('UserService') private userService: UserService
  ) {}
}
```

## 🏗️ DI Container

### Container Methods

```typescript
import { DIContainer } from '@soapjs/soap';

const container = new DIContainer();

// Binding methods
container.bind('token').toClass(Class);
container.bind('token').toValue(value);
container.bind('token').toFactory(factory);
container.bind('token').toInterface(implementation);
container.bind('token').toAbstract(implementation);

// Resolution methods
const instance = container.get('token');
const exists = container.has('token');

// Utility methods
container.clear();
const tokens = container.getTokens();
const provider = container.getProvider('token');
```

### Global DI Container

```typescript
import { DI } from '@soapjs/soap';

// Use the global container
DI.bind('Service').toClass(Service);
const service = DI.get('Service');
```

## 🔗 Binding Types

### 1. Class Binding

```typescript
// Simple class binding
DI.bind('UserService').toClass(UserService);

// With options
DI.bind('UserService').toClass(UserService, {
  scope: Scope.SINGLETON,
  dependencies: ['Database', 'Logger']
});
```

### 2. Value Binding

```typescript
// Bind a simple value
DI.bind('API_KEY').toValue('your-api-key');

// Bind a complex object
DI.bind('Config').toValue({
  database: {
    host: 'localhost',
    port: 5432
  }
});
```

### 3. Factory Binding

```typescript
// Simple factory
DI.bind('Database').toFactory(() => new Database());

// Factory with dependencies
DI.bind('Database').toFactory(
  (config: Config, logger: Logger) => new Database(config, logger),
  {
    dependencies: ['Config', 'Logger'],
    scope: Scope.SINGLETON
  }
);

// Factory with container injection
DI.bind('Service').toFactory(
  (container: DIContainer) => {
    const config = container.get('Config');
    return new Service(config);
  },
  {
    injectContainer: true
  }
);
```

### 4. Interface Binding

```typescript
// Bind interface to implementation
DI.bind('IUserRepository').toInterface(UserRepository);

// With options
DI.bind('IUserRepository').toInterface(UserRepository, {
  scope: Scope.SINGLETON
});
```

### 5. Abstract Binding

```typescript
// Bind abstract class to implementation
DI.bind('BaseService').toAbstract(UserService);
```

## 🎭 Scopes

### Singleton Scope

```typescript
DI.bind('Service').toClass(Service, { scope: Scope.SINGLETON });

// Same instance returned every time
const service1 = DI.get('Service');
const service2 = DI.get('Service');
console.log(service1 === service2); // true
```

### Transient Scope

```typescript
DI.bind('Service').toClass(Service, { scope: Scope.TRANSIENT });

// New instance created every time
const service1 = DI.get('Service');
const service2 = DI.get('Service');
console.log(service1 === service2); // false
```

### Request Scope

```typescript
DI.bind('Service').toClass(Service, { scope: Scope.REQUEST });

// Same instance within a request, new instance for each request
```

## 🔍 Dependency Resolution

### Automatic Resolution

```typescript
@Injectable()
export class UserService {
  constructor(
    @Inject('Database') private database: Database,
    @Inject('Logger') private logger: Logger
  ) {}
}

// Dependencies are automatically resolved
const userService = DI.get('UserService');
```

### Manual Resolution

```typescript
// Resolve dependencies manually
const database = DI.get('Database');
const logger = DI.get('Logger');
const userService = new UserService(database, logger);
```

### Circular Dependency Detection

```typescript
// The DI system automatically detects and prevents circular dependencies
@Injectable()
export class ServiceA {
  constructor(@Inject('ServiceB') private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(@Inject('ServiceA') private serviceA: ServiceA) {}
}

// This will throw an error about circular dependency
```

## 🎨 Decorators

### @Injectable

```typescript
import { Injectable } from '@soapjs/soap';

@Injectable()
export class UserService {
  // Class is automatically registered in DI container
}
```

### @Inject

```typescript
import { Inject } from '@soapjs/soap';

@Injectable()
export class UserService {
  constructor(
    @Inject('Database') private database: Database,
    @Inject('Logger') private logger: Logger
  ) {}
}
```

### Custom Token Injection

```typescript
@Injectable()
export class UserService {
  constructor(
    @Inject('UserRepository') private userRepo: IUserRepository,
    @Inject('EmailService') private emailService: IEmailService
  ) {}
}
```

## 🏆 Best Practices

### 1. Use Interfaces

```typescript
// ✅ Good: Use interfaces for better testability
interface IUserRepository {
  findById(id: string): Promise<User>;
}

DI.bind('IUserRepository').toInterface(UserRepository);

@Injectable()
export class UserService {
  constructor(@Inject('IUserRepository') private userRepo: IUserRepository) {}
}
```

### 2. Use Descriptive Tokens

```typescript
// ✅ Good: Descriptive tokens
DI.bind('UserRepository').toClass(UserRepository);
DI.bind('EmailService').toClass(EmailService);

// ❌ Avoid: Generic tokens
DI.bind('Service1').toClass(UserRepository);
DI.bind('Service2').toClass(EmailService);
```

### 3. Use Appropriate Scopes

```typescript
// ✅ Good: Use singleton for stateless services
DI.bind('UserService').toClass(UserService, { scope: Scope.SINGLETON });

// ✅ Good: Use transient for stateful services
DI.bind('RequestContext').toClass(RequestContext, { scope: Scope.TRANSIENT });
```

### 4. Use Factory for Complex Initialization

```typescript
// ✅ Good: Use factory for complex initialization
DI.bind('Database').toFactory(
  (config: Config) => {
    const connection = new Connection(config.database);
    connection.connect();
    return connection;
  },
  { dependencies: ['Config'] }
);
```

### 5. Use Value Binding for Configuration

```typescript
// ✅ Good: Use value binding for configuration
DI.bind('Config').toValue({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT)
  }
});
```

## 🔄 Migration Guide

### From Old DI System

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

### From Manual Registration

```typescript
// Before: Manual registration
class UserService {
  constructor(database: Database, logger: Logger) {}
}

// Register manually
DI.registerClass(UserService, 'UserService');
const userService = new UserService(database, logger);

// After: Automatic registration with decorators
@Injectable()
class UserService {
  constructor(
    @Inject('Database') private database: Database,
    @Inject('Logger') private logger: Logger
  ) {}
}

// Automatic registration and resolution
const userService = DI.get('UserService');
```

## 🚀 Advanced Usage

### Custom Binding Builder

```typescript
import { BindingBuilder } from '@soapjs/soap';

class CustomBindingBuilder<T> extends BindingBuilder<T> {
  toCustomImplementation(impl: T): DIContainer {
    // Custom binding logic
    return this.container.bindValue(this.token, impl);
  }
}
```

### Module Registration

```typescript
import { Module } from '@soapjs/soap';

const userModule: Module = {
  name: 'UserModule',
  providers: [
    { token: 'UserService', useClass: UserService },
    { token: 'UserRepository', useClass: UserRepository }
  ]
};

container.registerModule('UserModule', userModule);
```

### Context Creation

```typescript
const context = container.createContext('RequestContext', 'request', '/api/users');
container.registerFromContext([context]);
```

## 🔧 Troubleshooting

### Common Issues

1. **Circular Dependencies**: Use interfaces or factory patterns to break circular dependencies
2. **Missing Dependencies**: Ensure all dependencies are registered before use
3. **Scope Issues**: Use appropriate scopes for your use case
4. **Token Conflicts**: Use descriptive, unique tokens

### Debug Mode

```typescript
// Enable debug logging
const container = new DIContainer();
container.debug = true;

// Check registered tokens
console.log('Registered tokens:', container.getTokens());

// Check provider details
const provider = container.getProvider('UserService');
console.log('Provider details:', provider);
```

## 📚 Examples

See the `examples/` directory for complete working examples of the dependency injection system.

## License

MIT

