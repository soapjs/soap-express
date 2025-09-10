import { SoapExpressApp } from '../src/app';
import { SecurityConfig, securityPresets, createSecurityEndpoints } from '../src/security';

async function runSecurityExample() {
  console.log('=== Security Examples ===\n');

  // Example 1: Basic security configuration
  console.log('1. Basic Security Configuration');
  const app1 = new SoapExpressApp({});
  
  const basicConfig: SecurityConfig = {
    enabled: true,
    headers: {
      enabled: true,
      headers: {
        contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
        frameOptions: 'DENY',
        contentTypeOptions: true,
        xssProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
        strictTransportSecurity: 'max-age=31536000; includeSubDomains',
        permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
      }
    },
    csrf: {
      enabled: true,
      secret: 'your-secret-key-change-in-production',
      cookieName: '_csrf',
      cookieOptions: {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      },
      tokenLength: 32,
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      ignorePaths: ['/health', '/metrics']
    },
    sanitization: {
      enabled: true,
      options: {
        stripHtml: true,
        allowedTags: [],
        escapeSql: true,
        escapeHtml: true,
        preventPathTraversal: true,
        validateFileUploads: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        validateJson: true,
        maxJsonSize: 1024 * 1024 // 1MB
      }
    }
  };

  app1.useSecurity(basicConfig);

  // Add a route that demonstrates security features
  app1.getApp().post('/api/users', (req: any, res) => {
    // The request data is automatically sanitized
    res.json({
      message: 'User created successfully',
      receivedData: req.body,
      csrfToken: req.securityContext?.csrfToken
    });
  });

  // Example 2: Using security presets
  console.log('\n2. Security Presets');
  const app2 = new SoapExpressApp({});
  
  const strictConfig: SecurityConfig = {
    enabled: true,
    headers: securityPresets.strict as any,
    csrf: {
      enabled: true,
      secret: 'strict-secret-key',
      cookieName: '_csrf'
    },
    sanitization: {
      enabled: true,
      options: {
        stripHtml: true,
        escapeHtml: true,
        preventPathTraversal: true
      }
    }
  };

  app2.useSecurity(strictConfig);

  // Example 3: Minimal security for development
  console.log('\n3. Minimal Security for Development');
  const app3 = new SoapExpressApp({});
  
  const minimalConfig: SecurityConfig = {
    enabled: true,
    headers: securityPresets.minimal as any,
    csrf: {
      enabled: false, // Disabled for development
      secret: 'test'
    },
    sanitization: {
      enabled: true,
      options: {
        stripHtml: false, // Allow HTML in development
        escapeHtml: true,
        preventPathTraversal: true
      }
    }
  };

  app3.useSecurity(minimalConfig);

  // Example 4: Custom security configuration
  console.log('\n4. Custom Security Configuration');
  const app4 = new SoapExpressApp({});
  
  const customConfig: SecurityConfig = {
    enabled: true,
    headers: {
      enabled: true,
      headers: {
        contentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: https:;",
        frameOptions: 'SAMEORIGIN',
        contentTypeOptions: true,
        xssProtection: '1; mode=block',
        referrerPolicy: 'no-referrer-when-downgrade',
        strictTransportSecurity: false, // Disabled for development
        permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
      },
      customHeaders: {
        'X-Custom-Security-Header': 'custom-value',
        'X-API-Version': '1.0.0'
      }
    },
    csrf: {
      enabled: true,
      secret: 'custom-csrf-secret',
      cookieName: 'custom_csrf',
      cookieOptions: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7200000 // 2 hours
      },
      tokenLength: 64,
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS', 'TRACE'],
      ignorePaths: ['/health', '/metrics', '/api/public'],
      headerName: 'x-custom-csrf-token',
      bodyName: 'custom_csrf',
      queryName: 'custom_csrf'
    },
    sanitization: {
      enabled: true,
      options: {
        stripHtml: true,
        allowedTags: ['b', 'i', 'em', 'strong'], // Allow some HTML tags
        allowedAttributes: {
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'width', 'height']
        },
        escapeSql: true,
        escapeHtml: true,
        preventPathTraversal: true,
        validateFileUploads: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'text/plain'],
        validateJson: true,
        maxJsonSize: 512 * 1024 // 512KB
      },
      customSanitizers: {
        'email': (value: string) => value.toLowerCase().trim(),
        'phone': (value: string) => value.replace(/[^\d+\-\(\)\s]/g, ''),
        'username': (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '')
      }
    }
  };

  app4.useSecurity(customConfig);

  // Add custom sanitization example
  app4.getApp().post('/api/profile', (req: any, res) => {
    res.json({
      message: 'Profile updated',
      sanitizedData: req.body,
      securityContext: req.securityContext
    });
  });

  // Example 5: Security endpoints
  console.log('\n5. Security Endpoints');
  const app5 = new SoapExpressApp({});
  
  app5.useSecurity(basicConfig);

  // Add security endpoints
  const securityMiddleware5 = app5.getSecurityMiddleware()!;
  const endpoints = createSecurityEndpoints(securityMiddleware5);
  
  app5.getApp().get('/security/status', endpoints.status);
  app5.getApp().get('/security/csrf-token', endpoints.csrfToken);
  app5.getApp().get('/security/violations', endpoints.violations);

  // Example 6: Disabled security
  console.log('\n6. Disabled Security');
  const app6 = new SoapExpressApp({});
  
  const disabledConfig: SecurityConfig = {
    enabled: false,
    headers: { enabled: false, headers: {} },
    csrf: { enabled: false, secret: 'test' },
    sanitization: { enabled: false, options: {} }
  };

  app6.useSecurity(disabledConfig);

  // Example 7: Security with file uploads
  console.log('\n7. Security with File Uploads');
  const app7 = new SoapExpressApp({});
  
  const fileUploadConfig: SecurityConfig = {
    enabled: true,
    headers: { enabled: true, headers: {} },
    csrf: { enabled: true, secret: 'file-upload-secret' },
    sanitization: {
      enabled: true,
      options: {
        validateFileUploads: true,
        maxFileSize: 2 * 1024 * 1024, // 2MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
        stripHtml: true,
        escapeHtml: true,
        preventPathTraversal: true
      }
    }
  };

  app7.useSecurity(fileUploadConfig);

  // Add file upload route
  app7.getApp().post('/api/upload', (req: any, res) => {
    res.json({
      message: 'File upload processed',
      files: req.files,
      securityContext: req.securityContext
    });
  });

  // Example 8: Security monitoring
  console.log('\n8. Security Monitoring');
  const app8 = new SoapExpressApp({});
  
  app8.useSecurity(basicConfig);

  // Get security middleware for monitoring
  const securityMiddleware8 = app8.getSecurityMiddleware()!;

  // Add a route that triggers security violations
  app8.getApp().post('/api/test-violations', (req: any, res) => {
    // This will trigger sanitization violations
    res.json({
      message: 'Test completed',
      violations: securityMiddleware8.getSecurityViolations().length,
      stats: securityMiddleware8.getSecurityStats()
    });
  });

  // Simulate some requests to trigger security features
  console.log('\n9. Simulating Security Features...');
  
  // Test HTML sanitization
  const testData = {
    name: '<script>alert("xss")</script>',
    description: '<p>Hello <b>World</b></p>',
    path: '../../../etc/passwd',
    email: '  TEST@EXAMPLE.COM  ',
    phone: '+1 (555) 123-4567!@#',
    username: 'user@name!'
  };

  console.log('Original data:', testData);
  console.log('Security middleware will sanitize this data automatically');

  // Show security status
  const securityMiddleware1 = app1.getSecurityMiddleware()!;
  const stats = securityMiddleware1.getSecurityStats();
  console.log('\nSecurity Statistics:', stats);

  // Clean up
  console.log('\n🧹 Cleaning up...');
  app1.destroy();
  app2.destroy();
  app3.destroy();
  app4.destroy();
  app5.destroy();
  app6.destroy();
  app7.destroy();
  app8.destroy();

  console.log('\n✅ Security examples completed!');
  console.log('\n📋 Security Features Implemented:');
  console.log('  ✅ Security Headers (CSP, X-Frame-Options, HSTS, etc.)');
  console.log('  ✅ CSRF Protection (without external dependencies)');
  console.log('  ✅ Input Sanitization (HTML, SQL, XSS, Path Traversal)');
  console.log('  ✅ File Upload Validation');
  console.log('  ✅ Security Presets (Strict, Balanced, Minimal)');
  console.log('  ✅ Custom Sanitizers');
  console.log('  ✅ Security Monitoring and Violation Tracking');
  console.log('  ✅ Security Endpoints for Status and Tokens');
}

// Run the example
if (require.main === module) {
  runSecurityExample().catch(console.error);
}

export { runSecurityExample };
