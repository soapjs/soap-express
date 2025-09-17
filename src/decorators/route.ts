import { DecoratorRegistry } from './registry';
import { RouteMetadata } from '@soapjs/soap';
import { RouteAdditionalOptions } from '@soapjs/soap';

export function Get(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'GET',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'GET';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Post(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'POST',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'POST';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Put(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'PUT',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'PUT';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Delete(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'DELETE',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'DELETE';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Patch(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'PATCH',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'PATCH';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Head(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'HEAD',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'HEAD';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Options(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'OPTIONS',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'OPTIONS';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Trace(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'TRACE',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'TRACE';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function Connect(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'CONNECT',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'CONNECT';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

export function All(path: string, options?: RouteAdditionalOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      metadata = {
        method: 'ALL',
        path,
        middlewares: [],
        options
      };
    } else {
      // Update existing metadata
      metadata.method = 'ALL';
      metadata.path = path;
      metadata.options = options;
    }
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}
