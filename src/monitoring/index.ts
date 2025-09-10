// Main monitoring exports
export { MemoryMonitor } from './memory-monitor';
export { 
  MemoryMonitoringMiddleware, 
  createMemoryMonitoringMiddleware, 
  createMemoryConfig 
} from './middleware';

// Types
export type {
  MemoryInfo,
  MemoryLeakInfo,
  MemoryThreshold,
  MemoryMonitoringConfig,
  MemorySnapshot,
  MemoryStats
} from './types';

// Utilities
export {
  parseMemoryThreshold,
  formatBytes,
  calculateMemoryGrowth,
  defaultMemoryConfig
} from './types';
