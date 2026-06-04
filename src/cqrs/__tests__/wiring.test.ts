import 'reflect-metadata';
import { DIContainer, Result } from '@soapjs/soap/common';
import {
  InMemoryCommandBus,
  InMemoryQueryBus,
  InMemoryDomainEventBus,
  DomainEventBus,
  DomainEventConsumer,
} from '@soapjs/soap/cqrs';
import { BaseDomainEvent } from '@soapjs/soap/domain';
import { DecoratorRegistry } from '../../decorators/registry';
import { CommandHandler } from '../../decorators/command';
import { QueryHandler } from '../../decorators/query';
import { EventHandler } from '../../decorators/event';
import { CommandBus } from '../../decorators/bus';
import {
  wireCqrs,
  DEFAULT_COMMAND_BUS_TOKEN,
  DEFAULT_QUERY_BUS_TOKEN,
  DEFAULT_EVENT_BUS_TOKEN,
} from '../wiring';

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
    it('binds InMemoryCommandBus, InMemoryQueryBus and InMemoryDomainEventBus by default', async () => {
      const container = freshContainer();
      await wireCqrs(container);

      expect(container.has(DEFAULT_COMMAND_BUS_TOKEN)).toBe(true);
      expect(container.has(DEFAULT_QUERY_BUS_TOKEN)).toBe(true);
      expect(container.has(DEFAULT_EVENT_BUS_TOKEN)).toBe(true);

      const commandBus = container.get(DEFAULT_COMMAND_BUS_TOKEN);
      const queryBus = container.get(DEFAULT_QUERY_BUS_TOKEN);
      const eventBus = container.get(DEFAULT_EVENT_BUS_TOKEN);

      expect(commandBus).toBeInstanceOf(InMemoryCommandBus);
      expect(queryBus).toBeInstanceOf(InMemoryQueryBus);
      expect(eventBus).toBeInstanceOf(InMemoryDomainEventBus);
    });

    it('uses a pre-provided commandBus instance', async () => {
      const customBus = new InMemoryCommandBus();
      const container = freshContainer();
      await wireCqrs(container, { commandBus: customBus });

      expect(container.get(DEFAULT_COMMAND_BUS_TOKEN)).toBe(customBus);
    });

    it('uses a pre-provided queryBus instance', async () => {
      const customBus = new InMemoryQueryBus();
      const container = freshContainer();
      await wireCqrs(container, { queryBus: customBus });

      expect(container.get(DEFAULT_QUERY_BUS_TOKEN)).toBe(customBus);
    });

    it('respects custom bus tokens', async () => {
      const container = freshContainer();
      await wireCqrs(container, {
        commandBusToken: 'MyCommandBus',
        queryBusToken: 'MyQueryBus',
        eventBusToken: 'MyEventBus',
      });

      expect(container.has('MyCommandBus')).toBe(true);
      expect(container.has('MyQueryBus')).toBe(true);
      expect(container.has('MyEventBus')).toBe(true);
      expect(container.has(DEFAULT_COMMAND_BUS_TOKEN)).toBe(false);
      expect(container.has(DEFAULT_QUERY_BUS_TOKEN)).toBe(false);
      expect(container.has(DEFAULT_EVENT_BUS_TOKEN)).toBe(false);
    });

    it('does not overwrite an already-bound bus', async () => {
      const prebound = new InMemoryCommandBus();
      const container = freshContainer();
      container.bindValue(DEFAULT_COMMAND_BUS_TOKEN, prebound);

      await wireCqrs(container);

      expect(container.get(DEFAULT_COMMAND_BUS_TOKEN)).toBe(prebound);
    });
  });

  // ── Handler wiring ─────────────────────────────────────────────────────────

  describe('handler wiring', () => {
    it('binds command handler classes in the container', async () => {
      const container = freshContainer();
      await wireCqrs(container);

      expect(container.has('CommandHandler:CreateUserCommand')).toBe(true);
    });

    it('binds query handler classes in the container', async () => {
      const container = freshContainer();
      await wireCqrs(container);

      expect(container.has('QueryHandler:GetUserQuery')).toBe(true);
    });

    it('dispatches a command through the wired bus', async () => {
      const container = freshContainer();
      await wireCqrs(container);

      const bus = container.get<InMemoryCommandBus>(DEFAULT_COMMAND_BUS_TOKEN);
      const result = await bus.dispatch(new CreateUserCommand('Alice') as any);

      expect(result.failure).toBeUndefined();
      expect(result.content).toEqual({ name: 'Alice' });
    });

    it('dispatches a query through the wired bus', async () => {
      const container = freshContainer();
      await wireCqrs(container);

      const bus = container.get<InMemoryQueryBus>(DEFAULT_QUERY_BUS_TOKEN);
      const result = await bus.dispatch(new GetUserQuery('user-42') as any);

      expect(result.failure).toBeUndefined();
      expect(result.content).toEqual({ id: 'user-42' });
    });

    it('does not re-bind a handler already in the container', async () => {
      const container = freshContainer();
      const prebound = { handle: jest.fn().mockResolvedValue(ok(null)) };
      container.bindValue('CommandHandler:CreateUserCommand', prebound);

      await wireCqrs(container);

      expect(container.get('CommandHandler:CreateUserCommand')).toBe(prebound);
    });
  });

  // ── Empty registry ─────────────────────────────────────────────────────────

  describe('empty registry', () => {
    it('does not throw when no handlers are registered', async () => {
      DecoratorRegistry.clear();
      const container = freshContainer();
      await expect(wireCqrs(container)).resolves.toBeUndefined();
    });

    it('still binds buses when registry is empty', async () => {
      DecoratorRegistry.clear();
      const container = freshContainer();
      await wireCqrs(container);

      expect(container.has(DEFAULT_COMMAND_BUS_TOKEN)).toBe(true);
      expect(container.has(DEFAULT_QUERY_BUS_TOKEN)).toBe(true);
      expect(container.has(DEFAULT_EVENT_BUS_TOKEN)).toBe(true);
    });
  });

  // ── @CommandBus decorator integration ─────────────────────────────────────

  describe('@CommandBus decorator integration', () => {
    it('uses a custom bus class registered via @CommandBus()', async () => {
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
      await wireCqrs(container);

      const bus = container.get(DEFAULT_COMMAND_BUS_TOKEN);
      expect(bus).toBeInstanceOf(CustomCommandBus);
      // The handler was registered with the custom bus
      expect(registerSpy).toHaveBeenCalledWith(SomeCommand, expect.any(Object));
    });
  });

  // ── Event handler wiring ──────────────────────────────────────────────────

  describe('event handler wiring', () => {
    class CharacterCreated extends BaseDomainEvent<{ name: string }> {
      constructor(name: string) {
        super('character.created', `char_${name}`, { name });
      }
    }

    it('subscribes @EventHandler-decorated consumers to the default in-memory bus', async () => {
      DecoratorRegistry.clear();
      const received: CharacterCreated[] = [];

      @EventHandler(CharacterCreated)
      class CharacterCreatedProjector implements DomainEventConsumer<CharacterCreated> {
        async handle(event: CharacterCreated) {
          received.push(event);
        }
      }

      const container = freshContainer();
      await wireCqrs(container);

      const bus = container.get<DomainEventBus>(DEFAULT_EVENT_BUS_TOKEN);
      await bus.publish(new CharacterCreated('Spider-Man'));

      expect(received).toHaveLength(1);
      expect(received[0].data).toEqual({ name: 'Spider-Man' });

      // Sanity: the consumer was resolved out of the container — same instance as the projector.
      expect(container.has('EventHandler:CharacterCreated:CharacterCreatedProjector')).toBe(true);
    });

    it('uses the supplied DomainEventBus instance and binds it under the configured token', async () => {
      DecoratorRegistry.clear();
      const captured: Array<[unknown, unknown]> = [];
      const fakeBus: DomainEventBus = {
        publish: jest.fn(),
        subscribe: jest.fn(async (type: unknown, consumer: unknown) => {
          captured.push([type, consumer]);
        }),
      } as unknown as DomainEventBus;

      @EventHandler(CharacterCreated)
      class AnotherProjector implements DomainEventConsumer<CharacterCreated> {
        async handle() { /* no-op */ }
      }

      const container = freshContainer();
      await wireCqrs(container, { eventBus: fakeBus, eventBusToken: 'CustomEventBus' });

      expect(container.get('CustomEventBus')).toBe(fakeBus);
      expect(captured).toHaveLength(1);
      expect(captured[0][0]).toBe(CharacterCreated);
    });

    it('reuses an event bus already bound in the container instead of creating a new one', async () => {
      DecoratorRegistry.clear();
      const prebound = new InMemoryDomainEventBus();
      const container = freshContainer();
      container.bindValue(DEFAULT_EVENT_BUS_TOKEN, prebound);

      await wireCqrs(container);

      expect(container.get(DEFAULT_EVENT_BUS_TOKEN)).toBe(prebound);
    });

    it('opts out of event wiring when eventBus: false — registry decorators do not subscribe', async () => {
      DecoratorRegistry.clear();
      const received: unknown[] = [];

      @EventHandler(CharacterCreated)
      class OptOutProjector implements DomainEventConsumer<CharacterCreated> {
        async handle(event: CharacterCreated) {
          received.push(event);
        }
      }

      const container = freshContainer();
      await wireCqrs(container, { eventBus: false });

      expect(container.has(DEFAULT_EVENT_BUS_TOKEN)).toBe(false);
      // Even if the host wires its own bus later, OptOutProjector should not be
      // pre-resolved into our internal in-memory bus.
      expect(received).toEqual([]);
    });

    it('supports multiple handlers on the same event (fan-out)', async () => {
      DecoratorRegistry.clear();
      const order: string[] = [];

      @EventHandler(CharacterCreated)
      class Projector implements DomainEventConsumer<CharacterCreated> {
        async handle() { order.push('projector'); }
      }
      @EventHandler(CharacterCreated)
      class AuditLog implements DomainEventConsumer<CharacterCreated> {
        async handle() { order.push('audit'); }
      }

      const container = freshContainer();
      await wireCqrs(container);

      const bus = container.get<DomainEventBus>(DEFAULT_EVENT_BUS_TOKEN);
      await bus.publish(new CharacterCreated('Iron Man'));

      expect(order.sort()).toEqual(['audit', 'projector']);
    });
  });
});
