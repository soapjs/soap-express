import { RouteMetadata, ControllerMetadata } from '@soapjs/soap/http';
// CQRS metadata interfaces
export interface CommandHandlerMetadata {
  commandType: new (...args: any[]) => any;
  handlerClass: any;
  token: string;
  scope: string;
}

export interface QueryHandlerMetadata {
  queryType: new (...args: any[]) => any;
  handlerClass: any;
  token: string;
  scope: string;
}

export interface EventHandlerMetadata {
  eventType: new (...args: any[]) => any;
  handlerClass: any;
  token: string;
  scope: string;
}

export interface CommandBusMetadata {
  busClass: any;
  token: string;
  scope: string;
}

export interface QueryBusMetadata {
  busClass: any;
  token: string;
  scope: string;
}

export class DecoratorRegistry {
  private static routes = new Map<string, RouteMetadata>();
  private static controllers = new Map<string, ControllerMetadata>();
  
  // CQRS metadata
  private static commandHandlers = new Map<string, CommandHandlerMetadata>();
  private static queryHandlers = new Map<string, QueryHandlerMetadata>();
  private static eventHandlers = new Map<string, EventHandlerMetadata>();
  private static commandBuses = new Map<string, CommandBusMetadata>();
  private static queryBuses = new Map<string, QueryBusMetadata>();

  // Route registration
  static registerRoute(target: any, propertyKey: string, metadata: RouteMetadata) {
    // Handle both class and prototype
    let className: string;
    if (target.constructor && target.constructor === Function) {
      // If target is a class, use its name
      className = target.name;
    } else if (target.constructor) {
      // If target is a prototype, use constructor name
      className = target.constructor.name;
    } else {
      // Fallback to target name
      className = target.name;
    }
    const key = `${className}.${propertyKey}`;
    this.routes.set(key, metadata);
  }

  static getRoute(target: any, propertyKey: string): RouteMetadata | undefined {
    // Handle both class and prototype
    let className: string;
    if (target.constructor && target.constructor === Function) {
      // If target is a class, use its name
      className = target.name;
    } else if (target.constructor) {
      // If target is a prototype, use constructor name
      className = target.constructor.name;
    } else {
      // Fallback to target name
      className = target.name;
    }
    const key = `${className}.${propertyKey}`;
    return this.routes.get(key);
  }

  static getRoutes(): Map<string, RouteMetadata> {
    return this.routes;
  }

  // Controller registration
  static registerController(target: any, metadata: ControllerMetadata) {
    // Handle both class and prototype
    let className: string;
    if (target.constructor && target.constructor === Function) {
      // If target is a class, use its name
      className = target.name;
    } else if (target.constructor) {
      // If target is a prototype, use constructor name
      className = target.constructor.name;
    } else {
      // Fallback to target name
      className = target.name;
    }
    const key = className;
    this.controllers.set(key, metadata);
  }

  static getController(target: any): ControllerMetadata | undefined {
    // Handle both class and prototype
    let className: string;
    if (target.constructor && target.constructor === Function) {
      // If target is a class, use its name
      className = target.name;
    } else if (target.constructor) {
      // If target is a prototype, use constructor name
      className = target.constructor.name;
    } else {
      // Fallback to target name
      className = target.name;
    }
    const key = className;
    return this.controllers.get(key);
  }

  static getControllers(): Map<string, ControllerMetadata> {
    return this.controllers;
  }

  // CQRS Command Handler registration
  static registerCommandHandler(metadata: CommandHandlerMetadata) {
    this.commandHandlers.set(metadata.token, metadata);
  }

  static getCommandHandlers(): Map<string, CommandHandlerMetadata> {
    return this.commandHandlers;
  }

  static getCommandHandler(token: string): CommandHandlerMetadata | undefined {
    return this.commandHandlers.get(token);
  }

  // CQRS Query Handler registration
  static registerQueryHandler(metadata: QueryHandlerMetadata) {
    this.queryHandlers.set(metadata.token, metadata);
  }

  static getQueryHandlers(): Map<string, QueryHandlerMetadata> {
    return this.queryHandlers;
  }

  static getQueryHandler(token: string): QueryHandlerMetadata | undefined {
    return this.queryHandlers.get(token);
  }

  // CQRS Event Handler registration
  static registerEventHandler(metadata: EventHandlerMetadata) {
    this.eventHandlers.set(metadata.token, metadata);
  }

  static getEventHandlers(): Map<string, EventHandlerMetadata> {
    return this.eventHandlers;
  }

  static getEventHandler(token: string): EventHandlerMetadata | undefined {
    return this.eventHandlers.get(token);
  }

  // CQRS Command Bus registration
  static registerCommandBus(metadata: CommandBusMetadata) {
    this.commandBuses.set(metadata.token, metadata);
  }

  static getCommandBuses(): Map<string, CommandBusMetadata> {
    return this.commandBuses;
  }

  static getCommandBus(token: string): CommandBusMetadata | undefined {
    return this.commandBuses.get(token);
  }

  // CQRS Query Bus registration
  static registerQueryBus(metadata: QueryBusMetadata) {
    this.queryBuses.set(metadata.token, metadata);
  }

  static getQueryBuses(): Map<string, QueryBusMetadata> {
    return this.queryBuses;
  }

  static getQueryBus(token: string): QueryBusMetadata | undefined {
    return this.queryBuses.get(token);
  }

  // Clear registry (for testing)
  static clear() {
    this.routes.clear();
    this.controllers.clear();
    this.commandHandlers.clear();
    this.queryHandlers.clear();
    this.eventHandlers.clear();
    this.commandBuses.clear();
    this.queryBuses.clear();
  }
}
