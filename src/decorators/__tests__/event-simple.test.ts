import { DomainEvent, Scope } from '@soapjs/soap';
import { EventHandler } from '../event';
import { DecoratorRegistry } from '../registry';
import { DI } from '@soapjs/soap';

// Mock DI
const mockToClass = jest.fn();
jest.mock('@soapjs/soap', () => ({
  ...jest.requireActual('@soapjs/soap'),
  DI: {
    bind: jest.fn(() => ({
      toClass: mockToClass
    }))
  },
  Scope: {
    SINGLETON: 'singleton',
    TRANSIENT: 'transient',
    REQUEST: 'request'
  }
}));

describe('Event Decorators - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DecoratorRegistry.clear();
  });

  describe('@EventHandler', () => {
    it('should register event handler with default options', () => {
      class TestEvent {
        constructor(public data: string) {}
      }

      @EventHandler(TestEvent as any)
      class TestEventHandler {
        async handle(event: TestEvent): Promise<void> {
          console.log('Handling test event:', event.data);
        }
      }

      expect(DI.bind).toHaveBeenCalledWith('EventHandler:TestEvent');
      expect(mockToClass).toHaveBeenCalledWith(
        TestEventHandler,
        { scope: Scope.SINGLETON }
      );

      const eventHandlers = DecoratorRegistry.getEventHandlers();
      expect(eventHandlers.size).toBe(1);
      expect(eventHandlers.get('EventHandler:TestEvent')).toEqual({
        eventType: TestEvent,
        handlerClass: TestEventHandler,
        token: 'EventHandler:TestEvent',
        scope: 'singleton'
      });
    });

    it('should register event handler with custom options', () => {
      class TestEvent {
        constructor(public data: string) {}
      }

      @EventHandler(TestEvent as any, {
        token: 'CustomTestEventHandler',
        scope: Scope.TRANSIENT
      })
      class TestEventHandler {
        async handle(event: TestEvent): Promise<void> {
          console.log('Handling test event:', event.data);
        }
      }

      expect(DI.bind).toHaveBeenCalledWith('CustomTestEventHandler');
      expect(mockToClass).toHaveBeenCalledWith(
        TestEventHandler,
        { scope: Scope.TRANSIENT }
      );

      const eventHandlers = DecoratorRegistry.getEventHandlers();
      expect(eventHandlers.size).toBe(1);
      expect(eventHandlers.get('CustomTestEventHandler')).toEqual({
        eventType: TestEvent,
        handlerClass: TestEventHandler,
        token: 'CustomTestEventHandler',
        scope: 'transient'
      });
    });

    it('should register event handler with REQUEST scope', () => {
      class TestEvent {
        constructor(public data: string) {}
      }

      @EventHandler(TestEvent as any, {
        token: 'RequestTestEventHandler',
        scope: Scope.REQUEST
      })
      class TestEventHandler {
        async handle(event: TestEvent): Promise<void> {
          console.log('Handling test event:', event.data);
        }
      }

      expect(DI.bind).toHaveBeenCalledWith('RequestTestEventHandler');
      expect(mockToClass).toHaveBeenCalledWith(
        TestEventHandler,
        { scope: Scope.REQUEST }
      );

      const eventHandlers = DecoratorRegistry.getEventHandlers();
      expect(eventHandlers.get('RequestTestEventHandler')).toEqual({
        eventType: TestEvent,
        handlerClass: TestEventHandler,
        token: 'RequestTestEventHandler',
        scope: 'request'
      });
    });

    it('should work with different event types', () => {
      class UserCreatedEvent {
        constructor(public userId: string, public name: string) {}
      }

      class UserUpdatedEvent {
        constructor(public userId: string, public changes: Record<string, any>) {}
      }

      @EventHandler(UserCreatedEvent as any)
      class UserCreatedHandler {
        async handle(event: UserCreatedEvent): Promise<void> {
          console.log('User created:', event.userId, event.name);
        }
      }

      @EventHandler(UserUpdatedEvent as any)
      class UserUpdatedHandler {
        async handle(event: UserUpdatedEvent): Promise<void> {
          console.log('User updated:', event.userId, event.changes);
        }
      }

      const eventHandlers = DecoratorRegistry.getEventHandlers();
      expect(eventHandlers.size).toBe(2);
      expect(eventHandlers.has('EventHandler:UserCreatedEvent')).toBe(true);
      expect(eventHandlers.has('EventHandler:UserUpdatedEvent')).toBe(true);
    });
  });

  describe('Registry Integration', () => {
    it('should clear all event handler registrations', () => {
      class TestEvent {
        constructor(public data: string) {}
      }

      @EventHandler(TestEvent as any)
      class TestEventHandler {
        async handle(event: TestEvent): Promise<void> {
          console.log('Handling test event:', event.data);
        }
      }

      expect(DecoratorRegistry.getEventHandlers().size).toBe(1);

      DecoratorRegistry.clear();

      expect(DecoratorRegistry.getEventHandlers().size).toBe(0);
    });

    it('should get specific event handler by token', () => {
      class TestEvent {
        constructor(public data: string) {}
      }

      @EventHandler(TestEvent as any, { token: 'SpecificHandler' })
      class TestEventHandler {
        async handle(event: TestEvent): Promise<void> {
          console.log('Handling test event:', event.data);
        }
      }

      const handler = DecoratorRegistry.getEventHandler('SpecificHandler');

      expect(handler).toBeDefined();
      expect(handler?.handlerClass).toBe(TestEventHandler);
      expect(handler?.eventType).toBe(TestEvent);
    });

    it('should return undefined for non-existent event handler', () => {
      const handler = DecoratorRegistry.getEventHandler('NonExistent');

      expect(handler).toBeUndefined();
    });
  });
});
