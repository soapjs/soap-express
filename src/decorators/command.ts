import { Command } from '@soapjs/soap/cqrs';
import { Scope } from '@soapjs/soap/common';
import { DecoratorRegistry } from './registry';

/**
 * Registers a class as a handler for the given command type.
 *
 * The handler is recorded in {@link DecoratorRegistry} at decoration time.
 * Actual DI binding and bus wiring happen later, when
 * `wireCqrs(container)` is called during `createApp()` / `bootstrap()`.
 *
 * @example
 * import { BaseCommand } from '@soapjs/soap-express/cqrs';
 * import { CommandHandler } from '@soapjs/soap-express/cqrs';
 *
 * class CreateUserCommand extends BaseCommand { constructor(public name: string) { super(); } }
 *
 * @CommandHandler(CreateUserCommand)
 * class CreateUserCommandHandler {
 *   async handle(cmd: CreateUserCommand): Promise<Result<User>> { ... }
 * }
 */
export function CommandHandler<TCommand extends Command<TResult>, TResult = void>(
  commandType: new (...args: any[]) => TCommand,
  options?: {
    /** Override the DI token. Default: `"CommandHandler:<commandType.name>"`. */
    token?: string;
    scope?: Scope;
  }
): ClassDecorator {
  return function (target: any) {
    const token = options?.token ?? `CommandHandler:${commandType.name}`;
    DecoratorRegistry.registerCommandHandler({
      commandType,
      handlerClass: target,
      token,
      scope: (options?.scope ?? Scope.SINGLETON) as unknown as string,
    });
  };
}
