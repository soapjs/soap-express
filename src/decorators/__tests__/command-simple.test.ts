import { CommandHandler } from '../command';
import { DecoratorRegistry } from '../registry';

describe('CommandHandler decorator', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('default options', () => {
    it('registers metadata in DecoratorRegistry with default token and singleton scope', () => {
      class TestCommand {
        constructor(public data: string) {}
      }

      @CommandHandler(TestCommand as any)
      class TestCommandHandler {
        async handle(command: TestCommand) {
          return { success: true, data: command.data };
        }
      }

      const handlers = DecoratorRegistry.getCommandHandlers();
      expect(handlers.size).toBe(1);
      expect(handlers.get('CommandHandler:TestCommand')).toEqual({
        commandType: TestCommand,
        handlerClass: TestCommandHandler,
        token: 'CommandHandler:TestCommand',
        scope: 'singleton',
      });
    });

    it('does NOT call DI.bind() — DI wiring is deferred to wireCqrs()', () => {
      // If DI.bind were called here it would throw because there is no global
      // DI context in this test — confirming the decorator is metadata-only.
      class NoopCommand {}

      expect(() => {
        @CommandHandler(NoopCommand as any)
        class NoopHandler { async handle() {} }
      }).not.toThrow();
    });

    it('works with multiple command types', () => {
      class CreateUserCommand {}
      class UpdateUserCommand {}

      @CommandHandler(CreateUserCommand as any)
      class CreateUserHandler { async handle() {} }

      @CommandHandler(UpdateUserCommand as any)
      class UpdateUserHandler { async handle() {} }

      const handlers = DecoratorRegistry.getCommandHandlers();
      expect(handlers.size).toBe(2);
      expect(handlers.has('CommandHandler:CreateUserCommand')).toBe(true);
      expect(handlers.has('CommandHandler:UpdateUserCommand')).toBe(true);
    });
  });

  describe('custom options', () => {
    it('uses a custom token when provided', () => {
      class TestCommand {}

      @CommandHandler(TestCommand as any, { token: 'MyCustomHandler' })
      class TestCommandHandler { async handle() {} }

      const meta = DecoratorRegistry.getCommandHandler('MyCustomHandler');
      expect(meta).toBeDefined();
      expect(meta?.token).toBe('MyCustomHandler');
      expect(meta?.handlerClass).toBe(TestCommandHandler);
    });

    it('stores the supplied scope', () => {
      class TestCommand {}

      @CommandHandler(TestCommand as any, { scope: 'transient' as any })
      class TestCommandHandler { async handle() {} }

      const meta = DecoratorRegistry.getCommandHandler('CommandHandler:TestCommand');
      expect(meta?.scope).toBe('transient');
    });
  });

  describe('registry helpers', () => {
    it('getCommandHandler returns undefined for unknown token', () => {
      expect(DecoratorRegistry.getCommandHandler('NonExistent')).toBeUndefined();
    });

    it('clear() removes all command handler registrations', () => {
      class ACommand {}

      @CommandHandler(ACommand as any)
      class AHandler { async handle() {} }

      expect(DecoratorRegistry.getCommandHandlers().size).toBe(1);
      DecoratorRegistry.clear();
      expect(DecoratorRegistry.getCommandHandlers().size).toBe(0);
    });

    it('getCommandHandler returns the right handler class', () => {
      class SpecificCommand {}

      @CommandHandler(SpecificCommand as any, { token: 'SpecificHandler' })
      class SpecificHandler { async handle() {} }

      const meta = DecoratorRegistry.getCommandHandler('SpecificHandler');
      expect(meta?.handlerClass).toBe(SpecificHandler);
      expect(meta?.commandType).toBe(SpecificCommand);
    });
  });
});
