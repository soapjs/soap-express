/**
 * @soapjs/soap-express/cqrs
 *
 * CQRS integration for @soapjs/soap-express — decorators + core types.
 * Import from this entry point to keep CQRS modules out of
 * HTTP-only service bundles.
 *
 * @example
 * import { CommandHandler, QueryHandler, EventHandler, BaseCommand, BaseQuery } from '@soapjs/soap-express/cqrs';
 */

// Decorators
export * from './decorators/command';
export * from './decorators/query';
export * from './decorators/event';
export * from './decorators/bus';

// Core CQRS types — base classes and in-memory implementations
export {
  BaseCommand,
  InMemoryCommandBus,
  BaseQuery,
  InMemoryQueryBus,
} from '@soapjs/soap/cqrs';

// Domain events
export { BaseDomainEvent } from '@soapjs/soap/domain';
