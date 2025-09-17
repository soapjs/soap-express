import { Command, Scope } from '@soapjs/soap';
import { Command as CommandDecorator, CommandHandlerDecorator } from '../command';
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

describe('Command Decorators - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DecoratorRegistry.clear();
  });

  describe('@Command', () => {
    it('should register command handler with default options', () => {
      class TestCommand {
        constructor(public data: string) {}
      }

      @CommandDecorator(TestCommand as any)
      class TestCommandHandler {
        async handle(command: TestCommand) {
          return { success: true, data: command.data };
        }
      }

      expect(DI.bind).toHaveBeenCalledWith('CommandHandler:TestCommand');
      expect(mockToClass).toHaveBeenCalledWith(
        TestCommandHandler,
        { scope: Scope.SINGLETON }
      );

      const commandHandlers = DecoratorRegistry.getCommandHandlers();
      expect(commandHandlers.size).toBe(1);
      expect(commandHandlers.get('CommandHandler:TestCommand')).toEqual({
        commandType: TestCommand,
        handlerClass: TestCommandHandler,
        token: 'CommandHandler:TestCommand',
        scope: 'singleton'
      });
    });

    it('should work with different command types', () => {
      class CreateUserCommand {
        constructor(public name: string) {}
      }

      class UpdateUserCommand {
        constructor(public id: string, public name: string) {}
      }

      @CommandDecorator(CreateUserCommand as any)
      class CreateUserHandler {
        async handle(command: CreateUserCommand) {
          return { success: true, data: command.name };
        }
      }

      @CommandDecorator(UpdateUserCommand as any)
      class UpdateUserHandler {
        async handle(command: UpdateUserCommand) {
          return { success: true };
        }
      }

      const commandHandlers = DecoratorRegistry.getCommandHandlers();
      expect(commandHandlers.size).toBe(2);
      expect(commandHandlers.has('CommandHandler:CreateUserCommand')).toBe(true);
      expect(commandHandlers.has('CommandHandler:UpdateUserCommand')).toBe(true);
    });
  });

  describe('@CommandHandler', () => {
    it('should register command handler with custom options', () => {
      class TestCommand {
        constructor(public data: string) {}
      }

      @CommandHandlerDecorator(TestCommand as any, {
        token: 'CustomTestCommandHandler',
        scope: Scope.TRANSIENT
      })
      class TestCommandHandler {
        async handle(command: TestCommand) {
          return { success: true, data: command.data };
        }
      }

      expect(DI.bind).toHaveBeenCalledWith('CustomTestCommandHandler');
      expect(mockToClass).toHaveBeenCalledWith(
        TestCommandHandler,
        { scope: Scope.TRANSIENT }
      );

      const commandHandlers = DecoratorRegistry.getCommandHandlers();
      expect(commandHandlers.size).toBe(1);
      expect(commandHandlers.get('CustomTestCommandHandler')).toEqual({
        commandType: TestCommand,
        handlerClass: TestCommandHandler,
        token: 'CustomTestCommandHandler',
        scope: 'transient'
      });
    });

    it('should register command handler with REQUEST scope', () => {
      class TestCommand {
        constructor(public data: string) {}
      }

      @CommandHandlerDecorator(TestCommand as any, {
        token: 'RequestTestCommandHandler',
        scope: Scope.REQUEST
      })
      class TestCommandHandler {
        async handle(command: TestCommand) {
          return { success: true, data: command.data };
        }
      }

      expect(DI.bind).toHaveBeenCalledWith('RequestTestCommandHandler');
      expect(mockToClass).toHaveBeenCalledWith(
        TestCommandHandler,
        { scope: Scope.REQUEST }
      );

      const commandHandlers = DecoratorRegistry.getCommandHandlers();
      expect(commandHandlers.get('RequestTestCommandHandler')).toEqual({
        commandType: TestCommand,
        handlerClass: TestCommandHandler,
        token: 'RequestTestCommandHandler',
        scope: 'request'
      });
    });
  });

  describe('Registry Integration', () => {
    it('should clear all command handler registrations', () => {
      class TestCommand {
        constructor(public data: string) {}
      }

      @CommandDecorator(TestCommand as any)
      class TestCommandHandler {
        async handle(command: TestCommand) {
          return { success: true, data: command.data };
        }
      }

      expect(DecoratorRegistry.getCommandHandlers().size).toBe(1);

      DecoratorRegistry.clear();

      expect(DecoratorRegistry.getCommandHandlers().size).toBe(0);
    });

    it('should get specific command handler by token', () => {
      class TestCommand {
        constructor(public data: string) {}
      }

      @CommandHandlerDecorator(TestCommand as any, { token: 'SpecificHandler' })
      class TestCommandHandler {
        async handle(command: TestCommand) {
          return { success: true, data: command.data };
        }
      }

      const handler = DecoratorRegistry.getCommandHandler('SpecificHandler');

      expect(handler).toBeDefined();
      expect(handler?.handlerClass).toBe(TestCommandHandler);
      expect(handler?.commandType).toBe(TestCommand);
    });

    it('should return undefined for non-existent command handler', () => {
      const handler = DecoratorRegistry.getCommandHandler('NonExistent');

      expect(handler).toBeUndefined();
    });
  });
});
