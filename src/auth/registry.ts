import { AuthStrategy } from '@soapjs/soap/http';

export class AuthRegistry {
  private strategies = new Map<string, AuthStrategy>();

  register(strategy: AuthStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): AuthStrategy | undefined {
    return this.strategies.get(name);
  }

  has(name: string): boolean {
    return this.strategies.has(name);
  }

  getAll(): AuthStrategy[] {
    return Array.from(this.strategies.values());
  }

  clear(): void {
    this.strategies.clear();
  }

  // Get strategy names
  getNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Returns the name of the strategy that should be used when a caller didn't
   * specify one (e.g. `@AdminOnly()` / `@Auth({ roles })` without an explicit
   * `strategy`). Currently falls back to the first registered strategy.
   */
  getDefaultName(): string | undefined {
    const iter = this.strategies.keys().next();
    return iter.done ? undefined : iter.value;
  }
}
