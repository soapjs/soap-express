import { DecoratorRegistry } from './registry';
import { ControllerMetadata } from '../types';
import { DI } from '@soapjs/soap';
import { ApiDocOptions } from '../documentation/types';

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
    DI.registerClass(target);
  };
}

