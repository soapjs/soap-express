import { DecoratorRegistry } from './registry';
import { MiddlewareMetadata } from '@soapjs/soap';

export function Cors(options: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'cors',
        options,
        order: metadata.middlewares.length
      });
    }
  };
}

export function RateLimit(options: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'rateLimit',
        options,
        order: metadata.middlewares.length
      });
    }
  };
}

export function Authentication(options: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'authentication',
        options,
        order: metadata.middlewares.length
      });
    }
  };
}

export function Authorization(options: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'authorization',
        options,
        order: metadata.middlewares.length
      });
    }
  };
}

export function Validation(schema: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'validation',
        options: { schema },
        order: metadata.middlewares.length
      });
    }
  };
}

export function Logging(options: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'logging',
        options,
        order: metadata.middlewares.length
      });
    }
  };
}

export function Cache(options: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'cache',
        options,
        order: metadata.middlewares.length
      });
    }
  };
}

export function Middleware(middleware: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.middlewares.push({
        type: 'custom',
        options: {},
        middleware,
        order: metadata.middlewares.length
      });
    }
  };
}
