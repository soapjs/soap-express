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
}
