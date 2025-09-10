import { CommandBus, QueryBus, Scope } from '@soapjs/soap';
import { CommandBus as CommandBusDecorator, QueryBus as QueryBusDecorator } from '../bus';
import { DecoratorRegistry } from '../registry';
import { DI } from '@soapjs/soap';

// Mock DI
jest.mock('@soapjs/soap', () => ({
  ...jest.requireActual('@soapjs/soap'),
  DI: {
    registerClass: jest.fn()
  },
  Scope: {
    SINGLETON: 'singleton',
    TRANSIENT: 'transient',
    REQUEST: 'request'
  }
}));

describe('Bus Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DecoratorRegistry.clear();
  });

  describe('@CommandBus', () => {
    it('should register command bus with default options', () => {
      @CommandBusDecorator()
      class TestCommandBus implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestCommandBus,
        'CommandBus',
        { scope: Scope.SINGLETON }
      );

      const commandBuses = DecoratorRegistry.getCommandBuses();
      expect(commandBuses.size).toBe(1);
      expect(commandBuses.get('CommandBus')).toEqual({
        busClass: TestCommandBus,
        token: 'CommandBus',
        scope: 'singleton'
      });
    });

    it('should register command bus with custom options', () => {
      @CommandBusDecorator({
        token: 'CustomCommandBus',
        scope: Scope.TRANSIENT
      })
      class TestCommandBus implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestCommandBus,
        'CustomCommandBus',
        { scope: Scope.TRANSIENT }
      );

      const commandBuses = DecoratorRegistry.getCommandBuses();
      expect(commandBuses.size).toBe(1);
      expect(commandBuses.get('CustomCommandBus')).toEqual({
        busClass: TestCommandBus,
        token: 'CustomCommandBus',
        scope: 'transient'
      });
    });

    it('should register command bus with REQUEST scope', () => {
      @CommandBusDecorator({
        token: 'RequestCommandBus',
        scope: Scope.REQUEST
      })
      class TestCommandBus implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestCommandBus,
        'RequestCommandBus',
        { scope: Scope.REQUEST }
      );

      const commandBuses = DecoratorRegistry.getCommandBuses();
      expect(commandBuses.get('RequestCommandBus')).toEqual({
        busClass: TestCommandBus,
        token: 'RequestCommandBus',
        scope: 'request'
      });
    });

    it('should handle multiple command buses', () => {
      @CommandBusDecorator({ token: 'Bus1' })
      class TestCommandBus1 implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      @CommandBusDecorator({ token: 'Bus2' })
      class TestCommandBus2 implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const commandBuses = DecoratorRegistry.getCommandBuses();
      expect(commandBuses.size).toBe(2);
      expect(commandBuses.has('Bus1')).toBe(true);
      expect(commandBuses.has('Bus2')).toBe(true);
    });
  });

  describe('@QueryBus', () => {
    it('should register query bus with default options', () => {
      @QueryBusDecorator()
      class TestQueryBus implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestQueryBus,
        'QueryBus',
        { scope: Scope.SINGLETON }
      );

      const queryBuses = DecoratorRegistry.getQueryBuses();
      expect(queryBuses.size).toBe(1);
      expect(queryBuses.get('QueryBus')).toEqual({
        busClass: TestQueryBus,
        token: 'QueryBus',
        scope: 'singleton'
      });
    });

    it('should register query bus with custom options', () => {
      @QueryBusDecorator({
        token: 'CustomQueryBus',
        scope: Scope.TRANSIENT
      })
      class TestQueryBus implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestQueryBus,
        'CustomQueryBus',
        { scope: Scope.TRANSIENT }
      );

      const queryBuses = DecoratorRegistry.getQueryBuses();
      expect(queryBuses.size).toBe(1);
      expect(queryBuses.get('CustomQueryBus')).toEqual({
        busClass: TestQueryBus,
        token: 'CustomQueryBus',
        scope: 'transient'
      });
    });

    it('should register query bus with REQUEST scope', () => {
      @QueryBusDecorator({
        token: 'RequestQueryBus',
        scope: Scope.REQUEST
      })
      class TestQueryBus implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestQueryBus,
        'RequestQueryBus',
        { scope: Scope.REQUEST }
      );

      const queryBuses = DecoratorRegistry.getQueryBuses();
      expect(queryBuses.get('RequestQueryBus')).toEqual({
        busClass: TestQueryBus,
        token: 'RequestQueryBus',
        scope: 'request'
      });
    });

    it('should handle multiple query buses', () => {
      @QueryBusDecorator({ token: 'QueryBus1' })
      class TestQueryBus1 implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      @QueryBusDecorator({ token: 'QueryBus2' })
      class TestQueryBus2 implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const queryBuses = DecoratorRegistry.getQueryBuses();
      expect(queryBuses.size).toBe(2);
      expect(queryBuses.has('QueryBus1')).toBe(true);
      expect(queryBuses.has('QueryBus2')).toBe(true);
    });
  });

  describe('Registry Integration', () => {
    it('should clear all bus registrations', () => {
      @CommandBusDecorator({ token: 'TestCommandBus' })
      class TestCommandBus implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      @QueryBusDecorator({ token: 'TestQueryBus' })
      class TestQueryBus implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      expect(DecoratorRegistry.getCommandBuses().size).toBe(1);
      expect(DecoratorRegistry.getQueryBuses().size).toBe(1);

      DecoratorRegistry.clear();

      expect(DecoratorRegistry.getCommandBuses().size).toBe(0);
      expect(DecoratorRegistry.getQueryBuses().size).toBe(0);
    });

    it('should get specific bus by token', () => {
      @CommandBusDecorator({ token: 'SpecificCommandBus' })
      class TestCommandBus implements CommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      @QueryBusDecorator({ token: 'SpecificQueryBus' })
      class TestQueryBus implements QueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const commandBus = DecoratorRegistry.getCommandBus('SpecificCommandBus');
      const queryBus = DecoratorRegistry.getQueryBus('SpecificQueryBus');

      expect(commandBus).toBeDefined();
      expect(commandBus?.busClass).toBe(TestCommandBus);
      expect(queryBus).toBeDefined();
      expect(queryBus?.busClass).toBe(TestQueryBus);
    });

    it('should return undefined for non-existent bus', () => {
      const commandBus = DecoratorRegistry.getCommandBus('NonExistent');
      const queryBus = DecoratorRegistry.getQueryBus('NonExistent');

      expect(commandBus).toBeUndefined();
      expect(queryBus).toBeUndefined();
    });
  });
});
