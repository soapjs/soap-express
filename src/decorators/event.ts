import { DomainEvent, Scope } from '@soapjs/soap';
import { DecoratorRegistry } from './registry';
import { DI } from '@soapjs/soap';

/**
 * Event Handler interface
 */
export interface EventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<void>;
}

/**
 * Decorator for Event Handlers
 * Automatically registers the handler with the EventBus
 * 
 * @param eventType - The event class that this handler processes
 * @param options - Optional configuration
 */
export function EventHandler<TEvent extends DomainEvent>(
  eventType: new (...args: any[]) => TEvent,
  options?: {
    token?: string;
    scope?: Scope;
  }
) {
  return function (target: any) {
    // Register as injectable
    const token = options?.token || `EventHandler:${eventType.name}`;
    DI.registerClass(target, token, {
      scope: options?.scope || Scope.SINGLETON
    });

    // Store event handler metadata
    const metadata = {
      eventType,
      handlerClass: target,
      token: options?.token || `EventHandler:${eventType.name}`,
      scope: options?.scope || 'singleton'
    };

    DecoratorRegistry.registerEventHandler(metadata);
  };
}
