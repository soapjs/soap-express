import { SoapExpressApp } from '../src/app';
import { MemoryMonitoringConfig, createMemoryConfig } from '../src/monitoring';

async function runMemoryMonitoringExample() {
  console.log('=== Memory Monitoring Examples ===\n');

  // Example 1: Basic memory monitoring
  console.log('1. Basic Memory Monitoring');
  const app1 = new SoapExpressApp({});
  
  const basicConfig: MemoryMonitoringConfig = {
    enabled: true,
    interval: 5000, // Check every 5 seconds
    threshold: {
      used: 100 * 1024 * 1024, // 100MB
      percentage: 70, // 70%
      heapUsed: 50 * 1024 * 1024, // 50MB
      rss: 100 * 1024 * 1024 // 100MB
    },
    leakDetection: {
      enabled: true,
      consecutiveGrowths: 3,
      growthThreshold: 10, // 10% growth
      maxHistory: 20
    },
    onLeak: (info) => {
      console.log('🚨 Memory leak detected:', {
        severity: info.severity,
        growth: `${info.growth.percentage.toFixed(2)}%`,
        current: `${(info.current.used / 1024 / 1024).toFixed(2)}MB`,
        previous: `${(info.previous.used / 1024 / 1024).toFixed(2)}MB`
      });
    },
    onThreshold: (info) => {
      console.log('⚠️ Memory threshold exceeded:', {
        used: `${(info.used / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${info.percentage.toFixed(2)}%`
      });
    }
  };

  app1.useMemoryMonitoring(basicConfig);

  // Add a route that shows memory info
  app1.getApp().get('/memory', (req: any, res) => {
    const monitor = app1.getMemoryMonitor();
    const stats = monitor!.getStats();
    const summary = monitor!.getSummary();
    
    res.json({
      current: stats.current,
      summary: summary,
      history: stats.history.slice(-5), // Last 5 snapshots
      leaks: stats.leaks.length
    });
  });

  // Example 2: Using helper function for simple config
  console.log('\n2. Simple Configuration Helper');
  const app2 = new SoapExpressApp({});
  
  const simpleConfig = createMemoryConfig({
    threshold: '256MB',
    interval: 10000, // 10 seconds
    onLeak: (info) => {
      console.log('🔍 Leak detected with simple config:', info.severity);
    },
    onThreshold: (info) => {
      console.log('📊 Threshold exceeded with simple config');
    }
  });

  app2.useMemoryMonitoring(simpleConfig);

  // Example 3: Memory monitoring with custom labels
  console.log('\n3. Memory Monitoring with Custom Labels');
  const app3 = new SoapExpressApp({});
  
  const customConfig: MemoryMonitoringConfig = {
    enabled: true,
    interval: 3000,
    threshold: {
      used: 200 * 1024 * 1024, // 200MB
      percentage: 60,
      heapUsed: 100 * 1024 * 1024, // 100MB
      rss: 200 * 1024 * 1024 // 200MB
    },
    leakDetection: {
      enabled: true,
      consecutiveGrowths: 2,
      growthThreshold: 15,
      maxHistory: 15
    },
    customLabels: {
      service: 'memory-monitoring-demo',
      environment: 'development',
      version: '1.0.0'
    },
    onLeak: (info) => {
      console.log('🏷️ Custom labeled leak detection:', {
        labels: customConfig.customLabels,
        severity: info.severity
      });
    }
  };

  app3.useMemoryMonitoring(customConfig);

  // Example 4: Memory monitoring with aggressive leak detection
  console.log('\n4. Aggressive Leak Detection');
  const app4 = new SoapExpressApp({});
  
  const aggressiveConfig: MemoryMonitoringConfig = {
    enabled: true,
    interval: 1000, // Check every second
    threshold: {
      used: 50 * 1024 * 1024, // 50MB
      percentage: 40,
      heapUsed: 25 * 1024 * 1024, // 25MB
      rss: 50 * 1024 * 1024 // 50MB
    },
    leakDetection: {
      enabled: true,
      consecutiveGrowths: 2, // Detect after 2 consecutive growths
      growthThreshold: 5, // 5% growth threshold
      maxHistory: 30
    },
    onLeak: (info) => {
      console.log('🔥 Aggressive leak detection triggered:', {
        severity: info.severity,
        growth: `${info.growth.percentage.toFixed(2)}%`,
        consecutiveGrowths: '2+'
      });
    }
  };

  app4.useMemoryMonitoring(aggressiveConfig);

  // Example 5: Memory monitoring with automatic GC
  console.log('\n5. Memory Monitoring with Automatic GC');
  const app5 = new SoapExpressApp({});
  
  const gcConfig: MemoryMonitoringConfig = {
    enabled: true,
    interval: 2000,
    threshold: {
      used: 150 * 1024 * 1024, // 150MB
      percentage: 65,
      heapUsed: 75 * 1024 * 1024, // 75MB
      rss: 150 * 1024 * 1024 // 150MB
    },
    leakDetection: {
      enabled: true,
      consecutiveGrowths: 3,
      growthThreshold: 8,
      maxHistory: 25
    },
    onLeak: (info) => {
      console.log('🧹 Leak detected, forcing GC...');
      const monitor = app5.getMemoryMonitor();
      monitor!.forceGC();
    },
    onThreshold: (info) => {
      console.log('🧹 Threshold exceeded, forcing GC...');
      const monitor = app5.getMemoryMonitor();
      monitor!.forceGC();
    }
  };

  app5.useMemoryMonitoring(gcConfig);

  // Example 6: Disabled memory monitoring
  console.log('\n6. Disabled Memory Monitoring');
  const app6 = new SoapExpressApp({});
  
  const disabledConfig: MemoryMonitoringConfig = {
    enabled: false,
    interval: 5000,
    threshold: {
      used: 100 * 1024 * 1024,
      percentage: 70,
      heapUsed: 50 * 1024 * 1024,
      rss: 100 * 1024 * 1024
    },
    leakDetection: {
      enabled: false,
      consecutiveGrowths: 3,
      growthThreshold: 10,
      maxHistory: 20
    }
  };

  app6.useMemoryMonitoring(disabledConfig);

  // Simulate some memory usage
  console.log('\n7. Simulating Memory Usage...');
  const createMemoryPressure = (size: number) => {
    const arrays = [];
    for (let i = 0; i < size; i++) {
      arrays.push(new Array(1000).fill(`memory-pressure-${i}`));
    }
    return arrays;
  };

  // Create some memory pressure
  const memoryArrays = createMemoryPressure(50);
  console.log('Created memory pressure with 50 arrays');

  // Wait a bit to see monitoring in action
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Show current memory status
  const monitor = app1.getMemoryMonitor();
  if (monitor) {
    const summary = monitor.getSummary();
    console.log('\n📊 Current Memory Status:');
    console.log(`Status: ${summary.status}`);
    console.log(`Used: ${(summary.current.used / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Percentage: ${summary.current.percentage.toFixed(2)}%`);
    console.log(`Leaks detected: ${summary.leaks}`);
    console.log(`Uptime: ${summary.uptime.toFixed(2)}s`);
  }

  // Clean up
  console.log('\n🧹 Cleaning up...');
  app1.destroy();
  app2.destroy();
  app3.destroy();
  app4.destroy();
  app5.destroy();
  app6.destroy();

  console.log('\n✅ Memory monitoring examples completed!');
}

// Run the example
if (require.main === module) {
  runMemoryMonitoringExample().catch(console.error);
}

export { runMemoryMonitoringExample };
