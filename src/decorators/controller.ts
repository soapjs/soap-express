import { DecoratorRegistry } from './registry';
import { Injectable, ControllerMetadata } from '@soapjs/soap';

export interface ControllerOptions {
  middlewares?: any[];
  type?: 'http' | 'websocket';
  // API Documentation options
  apiDoc?: {
    tags?: string[];
    description?: string;
    externalDocs?: {
      description?: string;
      url: string;
    };
  };
}

export function Controller(basePath: string, options?: ControllerOptions) {
  return function (target: any) {
    const metadata: ControllerMetadata = {
      basePath,
      middlewares: options?.middlewares || [],
      type: options?.type || 'http'
    };

    // Add API documentation options if provided
    if (options?.apiDoc) {
      metadata.options = {
        apiDoc: options.apiDoc
      };
    }

    DecoratorRegistry.registerController(target, metadata);
    
    // Automatically register controller as injectable (like NestJS)
    Injectable()(target);
  };
}

