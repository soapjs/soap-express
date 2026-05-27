import { DIContainer, Scope } from '@soapjs/soap/common';
import {
  InMemoryCommandBus,
  CommandBus,
  CommandHandler as ICommandHandler,
  InMemoryQueryBus,
  QueryBus,
  QueryHandler as IQueryHandler,
} from '@soapjs/soap/cqrs';
import { DecoratorRegistry } from '../decorators/registry';

/** Default DI tokens for the buses. */
export const DEFAULT_COMMAND_BUS_TOKEN = 'CommandBus';
export const DEFAULT_QUERY_BUS_TOKEN = 'QueryBus';

/**
 * Configuration for {@link wireCqrs}.
 *
 * All fields are optional — the defaults work for most applications.
 */
export interface CqrsConfig {
  /**
   * Provide a pre-constructed CommandBus instance.
   * Defaults to a new {@link InMemoryCommandBus}.
   */
  commandBus?: CommandBus;

  /**
   * Provide a pre-constructed QueryBus instance.
   * Defaults to a new {@link InMemoryQueryBus}.
   */
  queryBus?: QueryBus;

  /**
   * DI token under which the CommandBus is bound.
   * @default 'CommandBus'
   */
  commandBusToken?: string;

  /**
   * DI token under which the QueryBus is bound.
   * @default 'QueryBus'
   */
  queryBusToken?: string;
}

/**
 * Wires all CQRS handlers that were registered via `@CommandHandler` /
 * `@QueryHandler` decorators to their respective buses, and binds both buses
 * in the given DI container.
 *
 * Call this once per app instance, after all dependencies are bound in the
 * container.  `createApp()` / `bootstrap()` call it automatically when
 * `cqrs` is truthy in {@link BootstrapConfig}.
 *
 * **Handler resolution order:**
 * 1. Bind the handler class in the container (skip if already bound).
 * 2. Resolve the handler from the container (dependencies are auto-injected).
 * 3. Register the resolved instance with the appropriate bus.
 *
 * @example
 * import { wireCqrs } from '@soapjs/soap-express/cqrs';
 *
 * const app = createApp({ controllers: [UserController] });
 * wireCqrs(app.getContainer());
 * await app.start(3000);
 */
export function wireCqrs(container: DIContainer, config: CqrsConfig = {}): void {
  const commandBusToken = config.commandBusToken ?? DEFAULT_COMMAND_BUS_TOKEN;
  const queryBusToken = config.queryBusToken ?? DEFAULT_QUERY_BUS_TOKEN;

  // ── 1. Determine / create buses ──────────────────────────────────────────

  // Check if user registered a custom bus class via @CommandBus decorator
  let commandBus: CommandBus;
  if (config.commandBus) {
    commandBus = config.commandBus;
  } else {
    const commandBusMeta = DecoratorRegistry.getCommandBus(commandBusToken);
    commandBus = commandBusMeta
      ? (new commandBusMeta.busClass() as CommandBus)
      : new InMemoryCommandBus();
  }

  let queryBus: QueryBus;
  if (config.queryBus) {
    queryBus = config.queryBus;
  } else {
    const queryBusMeta = DecoratorRegistry.getQueryBus(queryBusToken);
    queryBus = queryBusMeta
      ? (new queryBusMeta.busClass() as QueryBus)
      : new InMemoryQueryBus();
  }

  // ── 2. Bind buses in container (skip if already present) ─────────────────

  if (!container.has(commandBusToken)) {
    container.bindValue(commandBusToken, commandBus);
  } else {
    // Use whatever is already in the container (e.g. user pre-bound their own bus)
    commandBus = container.get<CommandBus>(commandBusToken);
  }

  if (!container.has(queryBusToken)) {
    container.bindValue(queryBusToken, queryBus);
  } else {
    queryBus = container.get<QueryBus>(queryBusToken);
  }

  // ── 3. Wire command handlers ──────────────────────────────────────────────

  DecoratorRegistry.getCommandHandlers().forEach(metadata => {
    if (!container.has(metadata.token)) {
      container.bindClass(metadata.token, metadata.handlerClass, {
        scope: metadata.scope as unknown as Scope,
      });
    }
    const handler = container.get<ICommandHandler<any, any>>(metadata.token);
    commandBus.register(metadata.commandType, handler);
  });

  // ── 4. Wire query handlers ────────────────────────────────────────────────

  DecoratorRegistry.getQueryHandlers().forEach(metadata => {
    if (!container.has(metadata.token)) {
      container.bindClass(metadata.token, metadata.handlerClass, {
        scope: metadata.scope as unknown as Scope,
      });
    }
    const handler = container.get<IQueryHandler<any, any>>(metadata.token);
    queryBus.register(metadata.queryType, handler);
  });
}
