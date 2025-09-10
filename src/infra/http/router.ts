import { Route, Router } from '@soapjs/soap';

export class ExpressRouter implements Router {
  readonly prefix?: string;
  readonly apiVersion?: string;
  private routes: Route[] = [];
  private initialized: boolean = false;

  constructor(prefix?: string, apiVersion?: string) {
    this.prefix = prefix;
    this.apiVersion = apiVersion;
  }

  initialize(...args: unknown[]): any {
    if (this.initialized) {
      return this;
    }

    this.setupRoutes(...args);
    this.initialized = true;
    return this;
  }

  setupRoutes(...args: unknown[]): void {
    // Override in subclasses to define routes
    // This method should be implemented by specific router implementations
  }

  async reloadRoutes(...args: unknown[]): Promise<void> {
    this.routes = [];
    this.initialized = false;
    await this.initialize(...args);
  }

  mount(data: Route | Route[]): any {
    if (Array.isArray(data)) {
      this.routes.push(...data);
    } else {
      this.routes.push(data);
    }
    return this;
  }

  // Additional utility methods
  getRoutes(): Route[] {
    return [...this.routes];
  }

  getRouteCount(): number {
    return this.routes.length;
  }

  clearRoutes(): void {
    this.routes = [];
  }

  // Helper method to create full path with prefix and version
  createFullPath(path: string): string {
    let fullPath = '';
    
    if (this.apiVersion) {
      fullPath += `/v${this.apiVersion}`;
    }
    
    if (this.prefix) {
      fullPath += this.prefix;
    }
    
    if (path && path !== '/') {
      fullPath += path;
    }
    
    return fullPath || '/';
  }

  // Method to check if router is initialized
  isInitialized(): boolean {
    return this.initialized;
  }
}
