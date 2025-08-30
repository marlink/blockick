/**
 * Performance monitoring utility for tracking system metrics
 * Used for baseline measurements and optimization validation
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fpsHistory: number[] = [];
  private isMonitoring: boolean = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    this.memoryBaseline = this.getMemoryUsage();
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    
    console.log('🔍 Performance monitoring started');
    console.log(`📊 Memory baseline: ${this.memoryBaseline.toFixed(2)} MB`);
  }

  /**
   * Stop performance monitoring and return summary
   */
  stopMonitoring(): PerformanceMetrics {
    this.isMonitoring = false;
    
    const summary: PerformanceMetrics = {
      memoryBaseline: this.memoryBaseline,
      currentMemory: this.getMemoryUsage(),
      averageFPS: this.getAverageFPS(),
      minFPS: Math.min(...this.fpsHistory),
      maxFPS: Math.max(...this.fpsHistory),
      frameCount: this.frameCount,
      customMetrics: Object.fromEntries(this.metrics)
    };
    
    console.log('📈 Performance monitoring stopped');
    console.log('📊 Performance Summary:', summary);
    
    return summary;
  }

  /**
   * Update frame metrics (call this every frame)
   */
  updateFrame(): void {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.fpsHistory.push(fps);
      
      // Keep only last 60 FPS measurements
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
    }
    
    this.lastFrameTime = currentTime;
    this.frameCount++;
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * Get current memory usage in MB
   */
  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Get average FPS from recent measurements
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    return this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0;
  }

  /**
   * Check if performance is degrading
   */
  isPerformanceDegrading(): boolean {
    if (this.fpsHistory.length < 30) return false;
    
    const recent = this.fpsHistory.slice(-10);
    const earlier = this.fpsHistory.slice(-30, -20);
    
    const recentAvg = recent.reduce((sum, fps) => sum + fps, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, fps) => sum + fps, 0) / earlier.length;
    
    return recentAvg < earlierAvg * 0.9; // 10% degradation threshold
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('🗑️ Manual garbage collection triggered');
    }
  }

  /**
   * Log current performance state
   */
  logCurrentState(): void {
    if (!this.isMonitoring) return;
    
    console.log('📊 Current Performance State:', {
      fps: this.getCurrentFPS().toFixed(1),
      memory: this.getMemoryUsage().toFixed(2) + ' MB',
      frameCount: this.frameCount,
      degrading: this.isPerformanceDegrading()
    });
  }
}

export interface PerformanceMetrics {
  memoryBaseline: number;
  currentMemory: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameCount: number;
  customMetrics: Record<string, number[]>;
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();