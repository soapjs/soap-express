import { SoapExpressApp } from '../src/app';
import { MetricsConfig, ConsoleMetricsClient } from '../src/metrics';

// Example custom metrics client (e.g., for Prometheus)
class PrometheusMetricsClient {
  private metrics: Array<{ name: string; value: number; labels: Record<string, string | number> }> = [];

  counter(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    this.metrics.push({ name, value, labels: labels || {} });
    console.log(`[PROMETHEUS] Counter: ${name} = ${value}`, labels || '');
  }

  histogram(name: string, value: number, labels?: Record<string, string | number>): void {
    this.metrics.push({ name, value, labels: labels || {} });
    console.log(`[PROMETHEUS] Histogram: ${name} = ${value}`, labels || '');
  }

  gauge(name: string, value: number, labels?: Record<string, string | number>): void {
    this.metrics.push({ name, value, labels: labels || {} });
    console.log(`[PROMETHEUS] Gauge: ${name} = ${value}`, labels || '');
  }

  summary(name: string, value: number, labels?: Record<string, string | number>): void {
    this.metrics.push({ name, value, labels: labels || {} });
    console.log(`[PROMETHEUS] Summary: ${name} = ${value}`, labels || '');
  }

  // Method to get all metrics (useful for /metrics endpoint)
  getAllMetrics() {
    return this.metrics;
  }
}

// Example StatsD client
class StatsDMetricsClient {
  counter(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    const labelStr = labels ? Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',') : '';
    console.log(`[STATSD] Counter: ${name}:${value}|c${labelStr ? '|#' + labelStr : ''}`);
  }

  histogram(name: string, value: number, labels?: Record<string, string | number>): void {
    const labelStr = labels ? Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',') : '';
    console.log(`[STATSD] Histogram: ${name}:${value}|h${labelStr ? '|#' + labelStr : ''}`);
  }

  gauge(name: string, value: number, labels?: Record<string, string | number>): void {
    const labelStr = labels ? Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',') : '';
    console.log(`[STATSD] Gauge: ${name}:${value}|g${labelStr ? '|#' + labelStr : ''}`);
  }

  summary(name: string, value: number, labels?: Record<string, string | number>): void {
    const labelStr = labels ? Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',') : '';
    console.log(`[STATSD] Summary: ${name}:${value}|ms${labelStr ? '|#' + labelStr : ''}`);
  }
}

async function runMetricsExample() {
  // Example 1: Using built-in console client
  console.log('=== Example 1: Console Client ===');
  const app1 = new SoapExpressApp({});
  
  const consoleConfig: MetricsConfig = {
    enabled: true,
    metrics: {
      responseTime: true,
      requestCount: true,
      errorRate: true,
      memoryUsage: true,
      cpuUsage: true
    },
    client: new ConsoleMetricsClient(),
    collectInterval: 5000, // 5 seconds
    includeRouteParams: false,
    customLabels: {
      service: 'my-api',
      version: '1.0.0'
    }
  };

  app1.useMetrics(consoleConfig);

  // Add a simple route
  app1.getApp().get('/api/users', (req, res) => {
    res.json({ users: [] });
  });

  // Example 2: Using custom Prometheus client
  console.log('\n=== Example 2: Prometheus Client ===');
  const app2 = new SoapExpressApp({});
  
  const prometheusConfig: MetricsConfig = {
    enabled: true,
    metrics: {
      responseTime: true,
      requestCount: true,
      errorRate: true,
      memoryUsage: false, // Disable for this example
      cpuUsage: false
    },
    client: new PrometheusMetricsClient(),
    customLabels: {
      environment: 'production',
      region: 'us-east-1'
    }
  };

  app2.useMetrics(prometheusConfig);

  // Add a route with custom metrics
  app2.getApp().get('/api/products', (req, res) => {
    const collector = app2.getMetricsCollector();
    
    // Custom business metrics
    collector!.counter('products_viewed', 1, { category: 'electronics' });
    collector!.histogram('product_search_time', 0.5, { category: 'electronics' });
    
    res.json({ products: [] });
  });

  // Example 3: Using StatsD client
  console.log('\n=== Example 3: StatsD Client ===');
  const app3 = new SoapExpressApp({});
  
  const statsdConfig: MetricsConfig = {
    enabled: true,
    metrics: {
      responseTime: true,
      requestCount: true,
      errorRate: true,
      memoryUsage: true,
      cpuUsage: true
    },
    client: new StatsDMetricsClient(),
    collectInterval: 10000, // 10 seconds
    includeRouteParams: true
  };

  app3.useMetrics(statsdConfig);

  // Add a route
  app3.getApp().get('/api/orders/:id', (req, res) => {
    const collector = app3.getMetricsCollector();
    
    // Custom order metrics
    collector!.counter('orders_accessed', 1, { order_type: 'online' });
    collector!.gauge('active_orders', 150);
    
    res.json({ order: { id: req.params.id } });
  });

  // Example 4: Custom metrics without built-in metrics
  console.log('\n=== Example 4: Custom Metrics Only ===');
  const app4 = new SoapExpressApp({});
  
  const customConfig: MetricsConfig = {
    enabled: true,
    metrics: {
      responseTime: false,
      requestCount: false,
      errorRate: false,
      memoryUsage: false,
      cpuUsage: false
    },
    client: new ConsoleMetricsClient()
  };

  app4.useMetrics(customConfig);

  const collector = app4.getMetricsCollector();
  
  // Record custom business metrics
  collector!.counter('user_registrations', 1, { source: 'web' });
  collector!.histogram('payment_processing_time', 2.5, { method: 'credit_card' });
  collector!.gauge('active_sessions', 1250);
  collector!.summary('database_query_time', 0.1, { table: 'users' });

  // Example 5: Disabled metrics
  console.log('\n=== Example 5: Disabled Metrics ===');
  const app5 = new SoapExpressApp({});
  
  const disabledConfig: MetricsConfig = {
    enabled: false,
    metrics: {
      responseTime: true,
      requestCount: true,
      errorRate: true,
      memoryUsage: true,
      cpuUsage: true
    },
    client: new ConsoleMetricsClient()
  };

  app5.useMetrics(disabledConfig);

  const disabledCollector = app5.getMetricsCollector();
  disabledCollector!.counter('should_not_appear', 1); // This won't be logged

  console.log('\n=== All examples completed ===');
  
  // Cleanup
  app1.destroy();
  app2.destroy();
  app3.destroy();
  app4.destroy();
  app5.destroy();
}

// Run the example
if (require.main === module) {
  runMetricsExample().catch(console.error);
}

export { runMetricsExample };
