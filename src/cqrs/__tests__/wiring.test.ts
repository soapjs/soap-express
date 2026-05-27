import 'reflect-metadata';
import { DIContainer, Result } from '@soapjs/soap/common';
import { InMemoryCommandBus, InMemoryQueryBus } from '@soapjs/soap/cqrs';
import { DecoratorRegistry } from '../../decorators/registry';
import { CommandHandler } from '../../decorators/command';
import { QueryHandler } from '../../decorators/query';
import { CommandBus } from '../../decorators/bus';
import { wireCqrs, DEFAULT_COMMAND_BUS_TOKEN, DEFAULT_QUERY_BUS_TOKEN } from '../wiring';

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshContainer(): DIContainer {
  return new DIContainer();
}

function ok<T>(content: T): Result<T> {
  return Result.withSuccess(content);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

class CreateUserCommand {
  constructor(public readonly name: string) {}
}

class GetUserQuery {
  constructor(public readonly id: string) {}
}

@CommandHandler(CreateUserCommand as any)
class CreateUserCommandHandler {
  async handle(cmd: CreateUserCommand): Promise<Result<{ name: string }>> {
    return ok({ name: cmd.name });
  }
}

@QueryHandler(GetUserQuery as any)
class GetUserQueryHandler {
  async handle(query: GetUserQuery): Promise<Result<{ id: string }>> {
    return ok({ id: query.id });
  }
}

// Keep the module-level registrations alive across tests.
const MODULE_COMMAND_META = {
  commandType: CreateUserCommand as any,
  handlerClass: CreateUserCommandHandler,
  token: 'CommandHandler:CreateUserCommand',
  scope: 'singleton',
};

const MODULE_QUERY_META = {
  queryType: GetUserQuery as any,
  handlerClass: GetUserQueryHandler,
  token: 'QueryHandler:GetUserQuery',
  scope: 'singleton',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('wireCqrs()', () => {
  afterEach(() => {
    // Restore module-level fixtures after each test that might mutate the registry.
    DecoratorRegistry.clear();
    DecoratorRegistry.registerCommandHandler(MODULE_COMMAND_META);
    DecoratorRegistry.registerQueryHandler(MODULE_QUERY_META);
  });

  // ── Bus creation ───────────────────────────────────────────────────────────

  describe('bus creation', () => {
    it('binds InMemoryCommandBus and InMemoryQueryBus by default', () => {
      const container = freshContainer();
      wireCqrs(container);

      expect(container.has(DEFAULT_COMMAND_BUS_TOKEN)).toBe(true);
      expect(container.has(DEFAULT_QUERY_BUS_TOKEN)).toBe(true);

      const commandBus = container.get(DEFAULT_COMMAND_BUS_TOKEN);
      const queryBus = container.get(DEFAULT_QUERY_BUS_TOKEN);

      expect(commandBus).toBeInstanceOf(InMemoryCommandBus);
      expect(queryBus).toBeInstanceOf(InMemoryQueryBus);
    });

    it('uses a pre-provided commandBus instance', () => {
      const customBus = new InMemoryCommandBus();
      const container = freshContainer();
      wireCqrs(container, { commandBus: customBus });

      expect(container.get(DEFAULT_COMMAND_BUS_TOKEN)).toBe(customBus);
    });

    it('uses a pre-provided queryBus instance', () => {
      const customBus = new InMemoryQueryBus();
      const container = freshContainer();
      wireCqrs(container, { queryBus: customBus });

      expect(container.get(DEFAULT_QUERY_BUS_TOKEN)).toBe(customBus);
    });

    it('respects custom bus tokens', () => {
      const container = freshContainer();
      wireCqrs(container, {
        commandBusToken: 'MyCommandBus',
        queryBusToken: 'MyQueryBus',
      });

      expect(container.has('MyCommandBus')).toBe(true);
      expect(container.has('MyQueryBus')).toBe(true);
      expect(container.has(DEFAULT_COMMAND_BUS_TOKEN)).toBe(false);
      expect(container.has(DEFAULT_QUERY_BUS_TOKEN)).toBe(false);
    });

    it('does not overwrite an already-bound bus', () => {
      const prebound = new InMemoryCommandBus();
      const container = freshContainer();
      container.bindValue(DEFAULT_COMMAND_BUS_TOKEN, prebound);

      wireCqrs(container);

      expect(container.get(DEFAULT_COMMAND_BUS_TOKEN)).toBe(prebound);
    });
  });

  // ── Handler wiring ─────────────────────────────────────────────────────────

  describe('handler wiring', () => {
    it('binds command handler classes in the container', () => {
      const container = freshContainer();
      wireCqrs(container);

      expect(container.has('CommandHandler:CreateUserCommand')).toBe(true);
    });

    it('binds query handler classes in the container', () => {
      const container = freshContainer();
      wireCqrs(container);

      expect(container.has('QueryHandler:GetUserQuery')).toBe(true);
    });

    it('dispatches a command through the wired bus', async () => {
      const container = freshContainer();
      wireCqrs(container);

      const bus = container.get<InMemoryCommandBus>(DEFAULT_COMMAND_BUS_TOKEN);
      const result = await bus.dispatch(new CreateUserCommand('Alice') as any);

      expect(result.failure).toBeUndefined();
      expect(result.content).toEqual({ name: 'Alice' });
    });

    it('dispatches a query through the wired bus', async () => {
      const container = freshContainer();
      wireCqrs(container);

      const bus = container.get<InMemoryQueryBus>(DEFAULT_QUERY_BUS_TOKEN);
      const result = await bus.dispatch(new GetUserQuery('user-42') as any);

      expect(result.failure).toBeUndefined();
      expect(result.content).toEqual({ id: 'user-42' });
    });

    it('does not re-bind a handler already in the container', () => {
      const container = freshContainer();
      const prebound = { handle: jest.fn().mockResolvedValue(ok(null)) };
      container.bindValue('CommandHandler:CreateUserCommand', prebound);

      wireCqrs(container);

      expect(container.get('CommandHandler:CreateUserCommand')).toBe(prebound);
    });
  });

  // ── Empty registry ─────────────────────────────────────────────────────────

  describe('empty registry', () => {
    it('does not throw when no handlers are registered', () => {
      DecoratorRegistry.clear();
      const container = freshContainer();
      expect(() => wireCqrs(container)).not.toThrow();
    });

    it('still binds buses when registry is empty', () => {
      DecoratorRegistry.clear();
      const container = freshContainer();
      wireCqrs(container);

      expect(container.has(DEFAULT_COMMAND_BUS_TOKEN)).toBe(true);
      expect(container.has(DEFAULT_QUERY_BUS_TOKEN)).toBe(true);
    });
  });

  // ── @CommandBus decorator integration ─────────────────────────────────────

  describe('@CommandBus decorator integration', () => {
    it('uses a custom bus class registered via @CommandBus()', () => {
      DecoratorRegistry.clear();

      const registerSpy = jest.fn();
      const dispatchSpy = jest.fn().mockResolvedValue(ok('ok'));

      @CommandBus()
      class CustomCommandBus {
        register = registerSpy;
        dispatch = dispatchSpy;
      }

      class SomeCommand {}

      @CommandHandler(SomeCommand as any)
      class SomeCommandHandler {
        async handle() { return ok('done'); }
      }

      const container = freshContainer();
      wireCqrs(container);

      const bus = container.get(DEFAULT_COMMAND_BUS_TOKEN);
      expect(bus).toBeInstanceOf(CustomCommandBus);
      // The handler was registered with the custom bus
      expect(registerSpy).toHaveBeenCalledWith(SomeCommand, expect.any(Object));
    });
  });
});
