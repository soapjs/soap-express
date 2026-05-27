import { Query } from '@soapjs/soap/cqrs';
import { Scope } from '@soapjs/soap/common';
import { DecoratorRegistry } from './registry';

/**
 * Registers a class as a handler for the given query type.
 *
 * The handler is recorded in {@link DecoratorRegistry} at decoration time.
 * Actual DI binding and bus wiring happen later, when
 * `wireCqrs(container)` is called during `createApp()` / `bootstrap()`.
 *
 * @example
 * import { BaseQuery } from '@soapjs/soap-express/cqrs';
 * import { QueryHandler } from '@soapjs/soap-express/cqrs';
 *
 * class GetUserQuery extends BaseQuery { constructor(public id: string) { super(); } }
 *
 * @QueryHandler(GetUserQuery)
 * class GetUserQueryHandler {
 *   async handle(q: GetUserQuery): Promise<Result<User>> { ... }
 * }
 */
export function QueryHandler<TQuery extends Query<TResult>, TResult = unknown>(
  queryType: new (...args: any[]) => TQuery,
  options?: {
    /** Override the DI token. Default: `"QueryHandler:<queryType.name>"`. */
    token?: string;
    scope?: Scope;
  }
): ClassDecorator {
  return function (target: any) {
    const token = options?.token ?? `QueryHandler:${queryType.name}`;
    DecoratorRegistry.registerQueryHandler({
      queryType,
      handlerClass: target,
      token,
      scope: (options?.scope ?? Scope.SINGLETON) as unknown as string,
    });
  };
}
