import { EventHandler } from '../event';
import { DecoratorRegistry } from '../registry';

describe('EventHandler decorator', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('default options', () => {
    it('registers metadata in DecoratorRegistry with default token and singleton scope', () => {
      class UserCreatedEvent {
        constructor(public userId: string) {}
      }

      @EventHandler(UserCreatedEvent as any)
      class UserCreatedHandler {
        async handle(event: UserCreatedEvent): Promise<void> {
          console.log('User created:', event.userId);
        }
      }

      const handlers = DecoratorRegistry.getEventHandlers();
      expect(handlers.size).toBe(1);
      expect(handlers.get('EventHandler:UserCreatedEvent:UserCreatedHandler')).toEqual({
        eventType: UserCreatedEvent,
        handlerClass: UserCreatedHandler,
        token: 'EventHandler:UserCreatedEvent:UserCreatedHandler',
        scope: 'singleton',
      });
    });

    it('does NOT call DI.bind() — DI wiring is deferred to the event bus', () => {
      class NoopEvent {}

      expect(() => {
        @EventHandler(NoopEvent as any)
        class NoopHandler { async handle(): Promise<void> {} }
      }).not.toThrow();
    });

    it('works with multiple event types', () => {
      class UserCreatedEvent {}
      class UserUpdatedEvent {}

      @EventHandler(UserCreatedEvent as any)
      class UserCreatedHandler { async handle(): Promise<void> {} }

      @EventHandler(UserUpdatedEvent as any)
      class UserUpdatedHandler { async handle(): Promise<void> {} }

      const handlers = DecoratorRegistry.getEventHandlers();
      expect(handlers.size).toBe(2);
      expect(handlers.has('EventHandler:UserCreatedEvent:UserCreatedHandler')).toBe(true);
      expect(handlers.has('EventHandler:UserUpdatedEvent:UserUpdatedHandler')).toBe(true);
    });

    it('registers MULTIPLE handlers for the SAME event type (fan-out)', () => {
      class OrderPlacedEvent {}

      @EventHandler(OrderPlacedEvent as any)
      class SendEmailHandler { async handle(): Promise<void> {} }

      @EventHandler(OrderPlacedEvent as any)
      class UpdateInventoryHandler { async handle(): Promise<void> {} }

      const handlers = DecoratorRegistry.getEventHandlers();
      // Both must survive — the default token includes the handler class name,
      // so the second handler no longer overwrites the first.
      expect(handlers.size).toBe(2);
      expect(handlers.has('EventHandler:OrderPlacedEvent:SendEmailHandler')).toBe(true);
      expect(handlers.has('EventHandler:OrderPlacedEvent:UpdateInventoryHandler')).toBe(true);
    });
  });

  describe('custom options', () => {
    it('uses a custom token when provided', () => {
      class SomeEvent {}

      @EventHandler(SomeEvent as any, { token: 'MySomeEventHandler' })
      class SomeEventHandler { async handle(): Promise<void> {} }

      const meta = DecoratorRegistry.getEventHandler('MySomeEventHandler');
      expect(meta).toBeDefined();
      expect(meta?.token).toBe('MySomeEventHandler');
      expect(meta?.handlerClass).toBe(SomeEventHandler);
    });

    it('stores the supplied scope', () => {
      class AnotherEvent {}

      @EventHandler(AnotherEvent as any, { scope: 'transient' as any })
      class AnotherEventHandler { async handle(): Promise<void> {} }

      const meta = DecoratorRegistry.getEventHandler('EventHandler:AnotherEvent:AnotherEventHandler');
      expect(meta?.scope).toBe('transient');
    });
  });

  describe('registry helpers', () => {
    it('getEventHandler returns undefined for unknown token', () => {
      expect(DecoratorRegistry.getEventHandler('NonExistent')).toBeUndefined();
    });

    it('clear() removes all event handler registrations', () => {
      class AnEvent {}

      @EventHandler(AnEvent as any)
      class AnEventHandler { async handle(): Promise<void> {} }

      expect(DecoratorRegistry.getEventHandlers().size).toBe(1);
      DecoratorRegistry.clear();
      expect(DecoratorRegistry.getEventHandlers().size).toBe(0);
    });

    it('getEventHandler returns the right handler class', () => {
      class SpecificEvent {}

      @EventHandler(SpecificEvent as any, { token: 'SpecificEventHandler' })
      class SpecificHandler { async handle(): Promise<void> {} }

      const meta = DecoratorRegistry.getEventHandler('SpecificEventHandler');
      expect(meta?.handlerClass).toBe(SpecificHandler);
      expect(meta?.eventType).toBe(SpecificEvent);
    });
  });
});
