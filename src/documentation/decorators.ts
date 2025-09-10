import { DecoratorRegistry } from '../decorators/registry';
import { ApiDocOptions, ApiResponse as ApiResponseType, ApiParameter as ApiParameterType, ApiTag } from './types';

/**
 * Main decorator for API documentation
 * @param options - API documentation options
 */
export function ApiDoc(options: ApiDocOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    // Store API documentation in route options
    metadata.options.apiDoc = options;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API response documentation
 * @param statusCode - HTTP status code
 * @param response - Response documentation
 */
export function ApiResponse(statusCode: string, response: ApiResponseType) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    if (!apiDoc.responses) {
      apiDoc.responses = {};
    }
    
    apiDoc.responses[statusCode] = response;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API parameter documentation
 * @param parameter - Parameter documentation
 */
export function ApiParameter(parameter: ApiParameterType) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    if (!apiDoc.parameters) {
      apiDoc.parameters = [];
    }
    
    apiDoc.parameters.push(parameter);
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API tags
 * @param tags - Array of tags
 */
export function ApiTags(...tags: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    apiDoc.tags = tags;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API summary
 * @param summary - Short summary of the endpoint
 */
export function ApiSummary(summary: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    apiDoc.summary = summary;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API description
 * @param description - Detailed description of the endpoint
 */
export function ApiDescription(description: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    apiDoc.description = description;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for marking endpoint as deprecated
 */
export function ApiDeprecated() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    apiDoc.deprecated = true;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API operation ID
 * @param operationId - Unique operation identifier
 */
export function ApiOperationId(operationId: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    apiDoc.operationId = operationId;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

/**
 * Decorator for API examples
 * @param examples - Object with examples
 */
export function ApiExamples(examples: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (!metadata) {
      throw new Error(`Route metadata not found for ${target.constructor.name}.${propertyKey}. Make sure to use @Get, @Post, etc. first.`);
    }
    
    if (!metadata.options) {
      metadata.options = {};
    }
    
    if (!metadata.options.apiDoc) {
      metadata.options.apiDoc = {};
    }
    
    const apiDoc = metadata.options.apiDoc as any;
    apiDoc.examples = examples;
    
    DecoratorRegistry.registerRoute(target, propertyKey, metadata);
  };
}

// @ApiController is now integrated into @Controller decorator
// Use @Controller('/path', { tags: [...], description: '...' }) instead
