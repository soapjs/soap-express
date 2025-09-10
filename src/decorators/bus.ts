import { CommandBus, QueryBus, Scope } from '@soapjs/soap';
import { DecoratorRegistry } from './registry';
import { DI } from '@soapjs/soap';

/**
 * Decorator for Command Bus
 * Automatically registers the bus in DI container
 * 
 * @param options - Optional configuration
 */
export function CommandBus(options?: {
  token?: string;
  scope?: Scope;
}) {
  return function (target: any) {
    // Register as injectable
    const token = options?.token || 'CommandBus';
    DI.registerClass(target, token, {
      scope: options?.scope || Scope.SINGLETON
    });

    // Store command bus metadata
    const metadata = {
      busClass: target,
      token: options?.token || 'CommandBus',
      scope: options?.scope || 'singleton'
    };

    DecoratorRegistry.registerCommandBus(metadata);
  };
}

/**
 * Decorator for Query Bus
 * Automatically registers the bus in DI container
 * 
 * @param options - Optional configuration
 */
export function QueryBus(options?: {
  token?: string;
  scope?: Scope;
}) {
  return function (target: any) {
    // Register as injectable
    const token = options?.token || 'QueryBus';
    DI.registerClass(target, token, {
      scope: options?.scope || Scope.SINGLETON
    });

    // Store query bus metadata
    const metadata = {
      busClass: target,
      token: options?.token || 'QueryBus',
      scope: options?.scope || 'singleton'
    };

    DecoratorRegistry.registerQueryBus(metadata);
  };
}
