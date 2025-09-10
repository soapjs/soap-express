import { SoapExpressApp, HealthCheckPlugin } from '../src';

// Example of using the plugin system
async function main() {
  // Create SoapExpress app
  const app = new SoapExpressApp({
    // Basic configuration
  });

  // Use the built-in health check plugin
  app.usePlugin(new HealthCheckPlugin({
    path: '/health',
    timeout: 5000,
    responseFormat: 'json'
  }));

  // Add custom health checks
  const healthPlugin = app.getPlugin('health-check') as HealthCheckPlugin;
  if (healthPlugin) {
    // Add database health check
    healthPlugin.addHealthCheck({
      name: 'database',
      check: async () => {
        // Simulate database check
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          status: 'healthy',
          message: 'Database connection is healthy',
          data: {
            connectionPool: 'active',
            queriesPerSecond: 150
          },
          timestamp: new Date().toISOString()
        };
      },
      critical: true
    });

    // Add Redis health check
    healthPlugin.addHealthCheck({
      name: 'redis',
      check: async () => {
        // Simulate Redis check
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          status: 'healthy',
          message: 'Redis cache is healthy',
          data: {
            memoryUsage: '45MB',
            connectedClients: 12
          },
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  // Start the server
  try {
    await app.start(3000);
    console.log('Server started with plugin system!');
    console.log('Health check available at: http://localhost:3000/health');
    
    // List installed plugins
    console.log('Installed plugins:', app.listPlugins().map(p => p.name));
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
