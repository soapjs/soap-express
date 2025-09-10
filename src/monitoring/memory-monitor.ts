import { 
  MemoryInfo, 
  MemoryLeakInfo, 
  MemoryMonitoringConfig, 
  MemorySnapshot, 
  MemoryStats,
  parseMemoryThreshold,
  formatBytes,
  calculateMemoryGrowth
} from './types';

export class MemoryMonitor {
  private config: MemoryMonitoringConfig;
  private interval?: NodeJS.Timeout;
  private stats: MemoryStats;
  private consecutiveGrowths: number = 0;
  private lastMemory: MemoryInfo | null = null;

  constructor(config: MemoryMonitoringConfig) {
    this.config = { ...config };
    this.stats = {
      current: this.getCurrentMemoryInfo(),
      history: [],
      leaks: [],
      uptime: process.uptime(),
      lastCheck: Date.now()
    };

    if (this.config.enabled) {
      this.start();
    }
  }

  // Start monitoring
  start(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      this.checkMemory();
    }, this.config.interval);
  }

  // Stop monitoring
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  // Get current memory information
  getCurrentMemoryInfo(): MemoryInfo {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const usedMem = memUsage.heapUsed;
    const percentage = (usedMem / totalMem) * 100;

    return {
      used: usedMem,
      total: totalMem,
      percentage,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers
    };
  }

  // Check memory and detect issues
  private checkMemory(): void {
    const current = this.getCurrentMemoryInfo();
    const previous = this.lastMemory;
    
    this.stats.current = current;
    this.stats.lastCheck = Date.now();
    this.stats.uptime = process.uptime();

    // Add to history
    this.stats.history.push({
      timestamp: Date.now(),
      memory: current,
      processUptime: process.uptime()
    });

    // Keep only recent history
    if (this.stats.history.length > this.config.leakDetection.maxHistory) {
      this.stats.history = this.stats.history.slice(-this.config.leakDetection.maxHistory);
    }

    // Check thresholds
    this.checkThresholds(current);

    // Check for memory leaks
    if (this.config.leakDetection.enabled && previous) {
      this.checkMemoryLeak(current, previous);
    }

    this.lastMemory = current;
  }

  // Check if memory exceeds thresholds
  private checkThresholds(current: MemoryInfo): void {
    const threshold = this.config.threshold;
    let exceeded = false;

    if (current.used > threshold.used) {
      console.warn(`Memory usage exceeded threshold: ${formatBytes(current.used)} > ${formatBytes(threshold.used)}`);
      exceeded = true;
    }

    if (current.percentage > threshold.percentage) {
      console.warn(`Memory percentage exceeded threshold: ${current.percentage.toFixed(2)}% > ${threshold.percentage}%`);
      exceeded = true;
    }

    if (current.heapUsed > threshold.heapUsed) {
      console.warn(`Heap usage exceeded threshold: ${formatBytes(current.heapUsed)} > ${formatBytes(threshold.heapUsed)}`);
      exceeded = true;
    }

    if (current.rss > threshold.rss) {
      console.warn(`RSS exceeded threshold: ${formatBytes(current.rss)} > ${formatBytes(threshold.rss)}`);
      exceeded = true;
    }

    if (exceeded && this.config.onThreshold) {
      this.config.onThreshold(current);
    }
  }

  // Check for memory leaks
  private checkMemoryLeak(current: MemoryInfo, previous: MemoryInfo): void {
    const growth = calculateMemoryGrowth(current, previous);
    const isGrowing = growth.percentage > this.config.leakDetection.growthThreshold;

    if (isGrowing) {
      this.consecutiveGrowths++;
    } else {
      this.consecutiveGrowths = 0;
    }

    // Detect leak if consecutive growths exceed threshold
    if (this.consecutiveGrowths >= this.config.leakDetection.consecutiveGrowths) {
      const leakInfo: MemoryLeakInfo = {
        timestamp: Date.now(),
        current,
        previous,
        growth,
        threshold: this.config.threshold,
        severity: this.getLeakSeverity(growth.percentage)
      };

      this.stats.leaks.push(leakInfo);

      console.warn('Memory leak detected:', {
        severity: leakInfo.severity,
        growth: `${growth.percentage.toFixed(2)}%`,
        current: formatBytes(current.used),
        previous: formatBytes(previous.used),
        consecutiveGrowths: this.consecutiveGrowths
      });

      if (this.config.onLeak) {
        this.config.onLeak(leakInfo);
      }

      // Reset consecutive growths after leak detection
      this.consecutiveGrowths = 0;
    }
  }

  // Determine leak severity based on growth percentage
  private getLeakSeverity(growthPercentage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (growthPercentage >= 50) return 'critical';
    if (growthPercentage >= 30) return 'high';
    if (growthPercentage >= 15) return 'medium';
    return 'low';
  }

  // Get current statistics
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  // Get memory history
  getHistory(): MemorySnapshot[] {
    return [...this.stats.history];
  }

  // Get detected leaks
  getLeaks(): MemoryLeakInfo[] {
    return [...this.stats.leaks];
  }

  // Force garbage collection (if available)
  forceGC(): void {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag');
    }
  }

  // Get memory summary
  getSummary(): {
    current: MemoryInfo;
    status: 'healthy' | 'warning' | 'critical';
    leaks: number;
    uptime: number;
    lastCheck: number;
  } {
    const current = this.stats.current;
    const threshold = this.config.threshold;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (current.percentage > threshold.percentage * 0.8) {
      status = 'warning';
    }
    
    if (current.percentage > threshold.percentage || current.used > threshold.used) {
      status = 'critical';
    }

    return {
      current,
      status,
      leaks: this.stats.leaks.length,
      uptime: this.stats.uptime,
      lastCheck: this.stats.lastCheck
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<MemoryMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.interval) {
      this.start();
    } else if (!this.config.enabled && this.interval) {
      this.stop();
    }
  }

  // Get current configuration
  getConfig(): MemoryMonitoringConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.stats.history = [];
    this.stats.leaks = [];
  }
}
