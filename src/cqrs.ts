/**
 * @soapjs/soap-express/cqrs
 *
 * CQRS integration for @soapjs/soap-express — decorators, wiring, and core types.
 * Import from this entry point to keep CQRS modules out of HTTP-only bundles.
 *
 * @example
 * import { CommandHandler, QueryHandler, wireCqrs, BaseCommand, BaseQuery } from '@soapjs/soap-express/cqrs';
 */

// ── Decorators ────────────────────────────────────────────────────────────────
export { CommandHandler } from './decorators/command';
export { QueryHandler } from './decorators/query';
export { EventHandler, IEventHandler } from './decorators/event';
export { CommandBus, QueryBus } from './decorators/bus';

// ── Bootstrap-time wiring ─────────────────────────────────────────────────────
export { wireCqrs } from './cqrs/wiring';
export type { CqrsConfig } from './cqrs/wiring';

// ── Core CQRS types — base classes and in-memory implementations ──────────────
export {
  BaseCommand,
  InMemoryCommandBus,
  BaseQuery,
  InMemoryQueryBus,
} from '@soapjs/soap/cqrs';

// Domain events
export { BaseDomainEvent } from '@soapjs/soap/domain';
