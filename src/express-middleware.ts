import * as Soap from "@soapjs/soap";

export class ExpressMiddleware implements Soap.Middleware {
  static isExpressMiddleware<T = ExpressMiddleware>(item: unknown): item is T {
    return (
      item &&
      typeof item["name"] === "string" &&
      typeof item["isDynamic"] === "boolean" &&
      typeof item["use"] === "function"
    );
  }

  constructor(
    public readonly name: string,
    public readonly isDynamic: boolean,
    private initFn?: Soap.AnyFunction,
    private useFn?: Soap.AnyFunction
  ) {}

  /**
   * Initializes the middleware.
   *
   * @param {...any[]} args - Arguments required for initialization.
   * @returns {void | Promise<void>} - Can return void or a Promise that resolves to void.
   */
  init(...args: any[]): void | Promise<void> {
    if (this.initFn) {
      return this.initFn(...args);
    }
  }

  /**
   * Applies the middleware function.
   *
   * @param {...any[]} args - Arguments required to apply the middleware.
   * @returns {any} - The result of the middleware's use function.
   */
  use(...args: any[]) {
    if (this.useFn) {
      return this.useFn(...args);
    }
  }
}
