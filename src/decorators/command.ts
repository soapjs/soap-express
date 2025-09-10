import { Command, Scope } from '@soapjs/soap';
import { DecoratorRegistry } from './registry';
import { DI } from '@soapjs/soap';

/**
 * Decorator for Command Handlers
 * Automatically registers the handler with the CommandBus
 * 
 * @param commandType - The command class that this handler processes
 * @param options - Optional configuration
 */
export function CommandHandlerDecorator<TCommand extends Command<TResult>, TResult = void>(
  commandType: new (...args: any[]) => TCommand,
  options?: {
    token?: string;
    scope?: Scope;
  }
) {
  return function (target: any) {
    // Register as injectable
    const token = options?.token || `CommandHandler:${commandType.name}`;
    DI.registerClass(target, token, {
      scope: options?.scope || Scope.SINGLETON
    });

    // Store command handler metadata
    const metadata = {
      commandType,
      handlerClass: target,
      token: options?.token || `CommandHandler:${commandType.name}`,
      scope: options?.scope || 'singleton'
    };

    DecoratorRegistry.registerCommandHandler(metadata);
  };
}

/**
 * Shorthand decorator for Command Handlers
 * @param commandType - The command class that this handler processes
 */
export function Command<TCommand extends Command<TResult>, TResult = void>(
  commandType: new (...args: any[]) => TCommand
) {
  return CommandHandlerDecorator(commandType);
}
