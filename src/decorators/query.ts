import { Query, Scope } from '@soapjs/soap';
import { DecoratorRegistry } from './registry';
import { DI } from '@soapjs/soap';

/**
 * Decorator for Query Handlers
 * Automatically registers the handler with the QueryBus
 * 
 * @param queryType - The query class that this handler processes
 * @param options - Optional configuration
 */
export function QueryHandlerDecorator<TQuery extends Query<TResult>, TResult = unknown>(
  queryType: new (...args: any[]) => TQuery,
  options?: {
    token?: string;
    scope?: Scope;
  }
) {
  return function (target: any) {
    // Register as injectable
    const token = options?.token || `QueryHandler:${queryType.name}`;
    DI.registerClass(target, token, {
      scope: options?.scope || Scope.SINGLETON
    });

    // Store query handler metadata
    const metadata = {
      queryType,
      handlerClass: target,
      token: options?.token || `QueryHandler:${queryType.name}`,
      scope: options?.scope || 'singleton'
    };

    DecoratorRegistry.registerQueryHandler(metadata);
  };
}

/**
 * Shorthand decorator for Query Handlers
 * @param queryType - The query class that this handler processes
 */
export function Query<TQuery extends Query<TResult>, TResult = unknown>(
  queryType: new (...args: any[]) => TQuery
) {
  return QueryHandlerDecorator(queryType);
}
