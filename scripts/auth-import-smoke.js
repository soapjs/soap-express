const auth = require('../build/auth');

const expected = [
  'AuthRegistry',
  'AuthMiddlewareFactory',
  'createExpressAuthContext',
  'authMiddleware',
  'requireRoles',
  'requirePermissions',
  'createAuthRouter',
  'setAuthCookies',
  'clearAuthCookies',
  'createCookieOAuth2Storage',
  'createExpressJwtAuth',
  'statusForAuthError',
  'sendAuthError',
];

for (const name of expected) {
  if (auth[name] === undefined) {
    throw new Error(`Missing auth export: ${name}`);
  }
}

console.log(`auth import smoke ok (${expected.length} exports)`);
