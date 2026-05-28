import { DomainEvent } from '@soapjs/soap/domain';
import { Scope } from '@soapjs/soap/common';
import { DecoratorRegistry } from './registry';

/**
 * Structural interface for event handler classes.
 * Implement this on your handler to get compile-time type-checking.
 *
 * @example
 * class MyHandler implements IEventHandler<UserCreatedEvent> {
 *   async handle(event: UserCreatedEvent): Promise<void> { ... }
 * }
 */
export interface IEventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<void>;
}

/**
 * Registers a class as a handler for the given domain event type.
 *
 * The handler is recorded in {@link DecoratorRegistry} at decoration time.
 * Use the event bus (wired via your own event dispatcher) to dispatch events to it.
 *
 * @example
 * @EventHandler(UserCreatedEvent)
 * class SendWelcomeEmailHandler implements IEventHandler<UserCreatedEvent> {
 *   async handle(event: UserCreatedEvent): Promise<void> { ... }
 * }
 */
export function EventHandler<TEvent extends DomainEvent>(
  eventType: new (...args: any[]) => TEvent,
  options?: {
    /** Override the DI token. Default: `"EventHandler:<eventType.name>:<handlerClass.name>"`. */
    token?: string;
    scope?: Scope;
  }
): ClassDecorator {
  return function (target: any) {
    // Include the handler class name so MULTIPLE handlers can subscribe to the
    // SAME event type (fan-out). Keying the registry by event name alone made
    // a second handler silently overwrite the first.
    const token = options?.token ?? `EventHandler:${eventType.name}:${target.name}`;
    DecoratorRegistry.registerEventHandler({
      eventType,
      handlerClass: target,
      token,
      scope: (options?.scope ?? Scope.SINGLETON) as unknown as string,
    });
  };
}
