// Memory monitoring types
export interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryLeakInfo {
  timestamp: number;
  current: MemoryInfo;
  previous: MemoryInfo;
  growth: {
    used: number;
    percentage: number;
    heapUsed: number;
    rss: number;
  };
  threshold: MemoryThreshold;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryThreshold {
  used: number; // in bytes
  percentage: number; // 0-100
  heapUsed: number; // in bytes
  rss: number; // in bytes
}

export interface MemoryMonitoringConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  threshold: MemoryThreshold;
  leakDetection: {
    enabled: boolean;
    consecutiveGrowths: number; // number of consecutive growths to trigger leak detection
    growthThreshold: number; // minimum growth percentage to consider
    maxHistory: number; // maximum number of memory snapshots to keep
  };
  onLeak?: (info: MemoryLeakInfo) => void;
  onThreshold?: (info: MemoryInfo) => void;
  customLabels?: Record<string, string | number>;
}

export interface MemorySnapshot {
  timestamp: number;
  memory: MemoryInfo;
  processUptime: number;
}

export interface MemoryStats {
  current: MemoryInfo;
  history: MemorySnapshot[];
  leaks: MemoryLeakInfo[];
  uptime: number;
  lastCheck: number;
}

// Default configuration
export const defaultMemoryConfig: MemoryMonitoringConfig = {
  enabled: true,
  interval: 30000, // 30 seconds
  threshold: {
    used: 512 * 1024 * 1024, // 512MB
    percentage: 80, // 80%
    heapUsed: 256 * 1024 * 1024, // 256MB
    rss: 512 * 1024 * 1024 // 512MB
  },
  leakDetection: {
    enabled: true,
    consecutiveGrowths: 3,
    growthThreshold: 10, // 10% growth
    maxHistory: 20
  }
};

// Utility functions
export function parseMemoryThreshold(threshold: string | number): number {
  if (typeof threshold === 'number') {
    return threshold;
  }
  
  const match = threshold.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)?$/i);
  if (!match) {
    throw new Error(`Invalid memory threshold format: ${threshold}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  
  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 1);
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function calculateMemoryGrowth(current: MemoryInfo, previous: MemoryInfo): {
  used: number;
  percentage: number;
  heapUsed: number;
  rss: number;
} {
  return {
    used: current.used - previous.used,
    percentage: previous.used > 0 ? ((current.used - previous.used) / previous.used) * 100 : 0,
    heapUsed: current.heapUsed - previous.heapUsed,
    rss: current.rss - previous.rss
  };
}
