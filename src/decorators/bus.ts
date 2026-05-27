import { Scope } from '@soapjs/soap/common';
import { DecoratorRegistry } from './registry';

/**
 * Marks a class as a custom CommandBus implementation.
 *
 * When a class decorated with `@CommandBus()` is present in the registry,
 * `wireCqrs()` will instantiate it instead of the default `InMemoryCommandBus`.
 *
 * @example
 * @CommandBus()
 * class RedisCommandBus implements CommandBus { ... }
 */
export function CommandBus(options?: {
  /** DI token to bind the bus under. Default: `'CommandBus'`. */
  token?: string;
  scope?: Scope;
}): ClassDecorator {
  return function (target: any) {
    DecoratorRegistry.registerCommandBus({
      busClass: target,
      token: options?.token ?? 'CommandBus',
      scope: (options?.scope ?? Scope.SINGLETON) as unknown as string,
    });
  };
}

/**
 * Marks a class as a custom QueryBus implementation.
 *
 * When a class decorated with `@QueryBus()` is present in the registry,
 * `wireCqrs()` will instantiate it instead of the default `InMemoryQueryBus`.
 *
 * @example
 * @QueryBus()
 * class CachedQueryBus implements QueryBus { ... }
 */
export function QueryBus(options?: {
  /** DI token to bind the bus under. Default: `'QueryBus'`. */
  token?: string;
  scope?: Scope;
}): ClassDecorator {
  return function (target: any) {
    DecoratorRegistry.registerQueryBus({
      busClass: target,
      token: options?.token ?? 'QueryBus',
      scope: (options?.scope ?? Scope.SINGLETON) as unknown as string,
    });
  };
}
