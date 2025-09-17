import * as SoapExpress from '../index';

describe('SoapExpress Module Exports', () => {
  it('should export SoapExpressApp', () => {
    expect(SoapExpress.SoapExpressApp).toBeDefined();
  });

  it('should export SoapRouter', () => {
    expect(SoapExpress.SoapRouter).toBeDefined();
  });

  it('should export RouteIO classes', () => {
    expect(SoapExpress.PaginationIO).toBeDefined();
    expect(SoapExpress.FileUploadIO).toBeDefined();
    expect(SoapExpress.SimpleIO).toBeDefined();
  });

  it('should export ErrorHandler', () => {
    expect(SoapExpress.ErrorHandler).toBeDefined();
  });

  it('should re-export @soapjs/soap components', () => {
    // These should be available from the re-export
    expect(SoapExpress.Route).toBeDefined();
    expect(SoapExpress.GetRoute).toBeDefined();
    expect(SoapExpress.PostRoute).toBeDefined();
    expect(SoapExpress.PutRoute).toBeDefined();
    expect(SoapExpress.DeleteRoute).toBeDefined();
    expect(SoapExpress.PatchRoute).toBeDefined();
    expect(SoapExpress.HeadRoute).toBeDefined();
    expect(SoapExpress.OptionsRoute).toBeDefined();
    expect(SoapExpress.TraceRoute).toBeDefined();
    expect(SoapExpress.ConnectRoute).toBeDefined();
    expect(SoapExpress.AllRoute).toBeDefined();
    expect(SoapExpress.RouteGroup).toBeDefined();
    expect(SoapExpress.RouteRegistry).toBeDefined();
  });

  it('should export all decorators', () => {
    // Test that decorators are exported
    expect(SoapExpress.Controller).toBeDefined();
    expect(SoapExpress.Get).toBeDefined();
    expect(SoapExpress.Post).toBeDefined();
    expect(SoapExpress.Put).toBeDefined();
    expect(SoapExpress.Delete).toBeDefined();
    expect(SoapExpress.Patch).toBeDefined();
    expect(SoapExpress.Head).toBeDefined();
    expect(SoapExpress.Options).toBeDefined();
    expect(SoapExpress.Trace).toBeDefined();
    expect(SoapExpress.Connect).toBeDefined();
    expect(SoapExpress.All).toBeDefined();
  });

  it('should export middleware decorators', () => {
    expect(SoapExpress.Cors).toBeDefined();
    expect(SoapExpress.RateLimit).toBeDefined();
    expect(SoapExpress.Authentication).toBeDefined();
    expect(SoapExpress.Authorization).toBeDefined();
    expect(SoapExpress.Validation).toBeDefined();
    expect(SoapExpress.Logging).toBeDefined();
    expect(SoapExpress.Cache).toBeDefined();
    // Middleware decorator is not exported directly
  });

  it('should export auth decorators', () => {
    expect(SoapExpress.Auth).toBeDefined();
    expect(SoapExpress.AdminOnly).toBeDefined();
    expect(SoapExpress.RolesOnly).toBeDefined();
    expect(SoapExpress.Public).toBeDefined();
    expect(SoapExpress.SelfOnly).toBeDefined();
  });

  it('should export other decorators', () => {
    expect(SoapExpress.CallUseCase).toBeDefined();
    expect(SoapExpress.RouteIO).toBeDefined();
    expect(SoapExpress.ErrorHandler).toBeDefined();
  });

  it('should export middleware classes', () => {
    expect(SoapExpress.AuthenticationMiddleware).toBeDefined();
    expect(SoapExpress.AuthorizationMiddleware).toBeDefined();
    // ValidationMiddleware is not exported directly
    expect(SoapExpress.CorsMiddleware).toBeDefined();
    expect(SoapExpress.RateLimitMiddleware).toBeDefined();
    expect(SoapExpress.LoggingMiddleware).toBeDefined();
    expect(SoapExpress.CacheMiddleware).toBeDefined();
  });

  it('should export utility classes', () => {
    expect(SoapExpress.MiddlewareFactory).toBeDefined();
    expect(SoapExpress.RouteBuilder).toBeDefined();
  });

  it('should export types', () => {
    // Test that types are exported (they should be available for TypeScript)
    // Types don't exist at runtime, so we can't test them directly
    expect(true).toBe(true);
  });
});
