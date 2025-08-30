/**
 * Memory Optimization Utilities
 * Implements object pooling, typed arrays, and manual garbage collection
 */
import { performanceMonitor } from './performanceMonitor';

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private objectPools: Map<string, ObjectPool<any>> = new Map();
  private typedArrayPools: Map<string, TypedArrayPool> = new Map();
  private gcTriggerThreshold: number = 50 * 1024 * 1024; // 50MB
  private lastGCTime: number = 0;
  private gcCooldown: number = 30000; // 30 seconds
  private memoryPressureCallbacks: Array<() => void> = [];

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  constructor() {
    this.initializeDefaultPools();
    this.startMemoryMonitoring();
    console.log('🧠 Memory Optimizer initialized');
  }

  /**
   * Initialize default object pools for common objects
   */
  private initializeDefaultPools(): void {
    // Grass blade object pool
    this.createObjectPool('grassBlade', () => ({
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      rotation: 0,
      windOffset: 0,
      color: '#4a7c23',
      layer: 0,
      atlasIndex: 0,
      visible: true
    }), 1000);

    // Vector2 object pool
    this.createObjectPool('vector2', () => ({
      x: 0,
      y: 0,
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
      },
      copy(other: any) {
        this.x = other.x;
        this.y = other.y;
        return this;
      },
      reset() {
        this.x = 0;
        this.y = 0;
        return this;
      }
    }), 500);

    // Render batch object pool
    this.createObjectPool('renderBatch', () => ({
      vertices: new Float32Array(1000),
      indices: new Uint16Array(1500),
      uvs: new Float32Array(1000),
      colors: new Uint32Array(250),
      vertexCount: 0,
      indexCount: 0,
      reset() {
        this.vertexCount = 0;
        this.indexCount = 0;
        return this;
      }
    }), 50);

    // Typed array pools
    this.createTypedArrayPool('float32', Float32Array, [256, 512, 1024, 2048, 4096]);
    this.createTypedArrayPool('uint16', Uint16Array, [256, 512, 1024, 2048]);
    this.createTypedArrayPool('uint32', Uint32Array, [128, 256, 512, 1024]);
    this.createTypedArrayPool('uint8', Uint8Array, [512, 1024, 2048, 4096]);
  }

  /**
   * Create an object pool for a specific type
   */
  createObjectPool<T>(name: string, factory: () => T, initialSize: number = 100): ObjectPool<T> {
    const pool = new ObjectPool<T>(factory, initialSize);
    this.objectPools.set(name, pool);
    console.log(`📦 Created object pool '${name}' with ${initialSize} objects`);
    return pool;
  }

  /**
   * Create a typed array pool
   */
  createTypedArrayPool(
    name: string, 
    arrayType: any, 
    sizes: number[], 
    poolSizePerSize: number = 10
  ): TypedArrayPool {
    const pool = new TypedArrayPool(arrayType, sizes, poolSizePerSize);
    this.typedArrayPools.set(name, pool);
    console.log(`🔢 Created typed array pool '${name}' for sizes: ${sizes.join(', ')}`);
    return pool;
  }

  /**
   * Get an object from a pool
   */
  getObject<T>(poolName: string): T | null {
    const pool = this.objectPools.get(poolName);
    if (!pool) {
      console.warn(`⚠️ Object pool '${poolName}' not found`);
      return null;
    }
    return pool.get();
  }

  /**
   * Return an object to a pool
   */
  returnObject<T>(poolName: string, obj: T): void {
    const pool = this.objectPools.get(poolName);
    if (!pool) {
      console.warn(`⚠️ Object pool '${poolName}' not found`);
      return;
    }
    pool.return(obj);
  }

  /**
   * Get a typed array from a pool
   */
  getTypedArray(poolName: string, size: number): any {
    const pool = this.typedArrayPools.get(poolName);
    if (!pool) {
      console.warn(`⚠️ Typed array pool '${poolName}' not found`);
      return null;
    }
    return pool.get(size);
  }

  /**
   * Return a typed array to a pool
   */
  returnTypedArray(poolName: string, array: any): void {
    const pool = this.typedArrayPools.get(poolName);
    if (!pool) {
      console.warn(`⚠️ Typed array pool '${poolName}' not found`);
      return;
    }
    pool.return(array);
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check for memory pressure and trigger optimization
   */
  private checkMemoryPressure(): void {
    const memoryUsage = performanceMonitor.getMemoryUsage();
    
    if (memoryUsage > this.gcTriggerThreshold) {
      const now = Date.now();
      if (now - this.lastGCTime > this.gcCooldown) {
        console.log(`🧹 Memory pressure detected: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        this.triggerMemoryOptimization();
        this.lastGCTime = now;
      }
    }
  }

  /**
   * Trigger memory optimization procedures
   */
  private triggerMemoryOptimization(): void {
    const startTime = performance.now();
    
    // Clean up object pools
    this.optimizeObjectPools();
    
    // Clean up typed array pools
    this.optimizeTypedArrayPools();
    
    // Trigger memory pressure callbacks
    this.memoryPressureCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Memory pressure callback failed:', error);
      }
    });
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    const optimizationTime = performance.now() - startTime;
    performanceMonitor.recordMetric('memory_optimization_time', optimizationTime);
    
    console.log(`✅ Memory optimization completed in ${optimizationTime.toFixed(2)}ms`);
  }

  /**
   * Optimize object pools by reducing excess capacity
   */
  private optimizeObjectPools(): void {
    this.objectPools.forEach((pool, name) => {
      const beforeSize = pool.size();
      pool.optimize();
      const afterSize = pool.size();
      
      if (beforeSize !== afterSize) {
        console.log(`🔧 Optimized pool '${name}': ${beforeSize} → ${afterSize}`);
      }
    });
  }

  /**
   * Optimize typed array pools
   */
  private optimizeTypedArrayPools(): void {
    this.typedArrayPools.forEach((pool, name) => {
      const beforeSize = pool.getTotalSize();
      pool.optimize();
      const afterSize = pool.getTotalSize();
      
      if (beforeSize !== afterSize) {
        console.log(`🔧 Optimized typed array pool '${name}': ${beforeSize} → ${afterSize}`);
      }
    });
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('🗑️ Forced garbage collection');
    } else if (typeof global !== 'undefined' && typeof (global as any).gc === 'function') {
      (global as any).gc();
      console.log('🗑️ Forced garbage collection');
    } else {
      // Fallback: create memory pressure to encourage GC
      const temp = new Array(1000000).fill(0);
      temp.length = 0;
    }
  }

  /**
   * Register callback for memory pressure events
   */
  onMemoryPressure(callback: () => void): void {
    this.memoryPressureCallbacks.push(callback);
  }

  /**
   * Get memory optimization statistics
   */
  getStats(): MemoryStats {
    const objectPoolStats = new Map<string, PoolStats>();
    const typedArrayPoolStats = new Map<string, TypedArrayPoolStats>();
    
    this.objectPools.forEach((pool, name) => {
      objectPoolStats.set(name, pool.getStats());
    });
    
    this.typedArrayPools.forEach((pool, name) => {
      typedArrayPoolStats.set(name, pool.getStats());
    });
    
    return {
      memoryUsage: performanceMonitor.getMemoryUsage(),
      objectPools: objectPoolStats,
      typedArrayPools: typedArrayPoolStats,
      lastGCTime: this.lastGCTime,
      gcTriggerThreshold: this.gcTriggerThreshold
    };
  }

  /**
   * Set garbage collection trigger threshold
   */
  setGCThreshold(threshold: number): void {
    this.gcTriggerThreshold = threshold;
    console.log(`🎯 GC threshold set to ${(threshold / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Clear all pools and reset
   */
  reset(): void {
    this.objectPools.forEach(pool => pool.clear());
    this.typedArrayPools.forEach(pool => pool.clear());
    this.memoryPressureCallbacks = [];
    console.log('🔄 Memory optimizer reset');
  }

  /**
   * Destroy memory optimizer
   */
  destroy(): void {
    this.reset();
    this.objectPools.clear();
    this.typedArrayPools.clear();
    console.log('🧹 Memory Optimizer destroyed');
  }
}

/**
 * Object Pool implementation
 */
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private created: number = 0;
  private reused: number = 0;

  constructor(factory: () => T, initialSize: number = 100, maxSize: number = 1000) {
    this.factory = factory;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
      this.created++;
    }
  }

  get(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.reused++;
      return obj;
    }
    
    this.created++;
    return this.factory();
  }

  return(obj: T): void {
    if (this.pool.length < this.maxSize) {
      // Reset object if reset function is provided
      if (this.resetFn) {
        this.resetFn(obj);
      } else if (typeof (obj as any).reset === 'function') {
        (obj as any).reset();
      }
      
      this.pool.push(obj);
    }
  }

  setResetFunction(resetFn: (obj: T) => void): void {
    this.resetFn = resetFn;
  }

  size(): number {
    return this.pool.length;
  }

  optimize(): void {
    // Keep only 50% of current pool size to reduce memory usage
    const targetSize = Math.floor(this.pool.length * 0.5);
    this.pool.splice(targetSize);
  }

  clear(): void {
    this.pool = [];
    this.created = 0;
    this.reused = 0;
  }

  getStats(): PoolStats {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      created: this.created,
      reused: this.reused,
      reuseRate: this.created > 0 ? this.reused / (this.created + this.reused) : 0
    };
  }
}

/**
 * Typed Array Pool implementation
 */
class TypedArrayPool {
  private pools: Map<number, any[]> = new Map();
  private arrayType: any;
  private maxPoolSize: number;
  private stats: Map<number, { created: number; reused: number }> = new Map();

  constructor(arrayType: any, sizes: number[], maxPoolSize: number = 10) {
    this.arrayType = arrayType;
    this.maxPoolSize = maxPoolSize;
    
    // Initialize pools for each size
    sizes.forEach(size => {
      this.pools.set(size, []);
      this.stats.set(size, { created: 0, reused: 0 });
      
      // Pre-populate with a few arrays
      for (let i = 0; i < Math.min(3, maxPoolSize); i++) {
        const array = new arrayType(size);
        this.pools.get(size)!.push(array);
        this.stats.get(size)!.created++;
      }
    });
  }

  get(size: number): any {
    const pool = this.pools.get(size);
    const stat = this.stats.get(size);
    
    if (pool && pool.length > 0) {
      if (stat) stat.reused++;
      return pool.pop();
    }
    
    // Find closest larger size
    const availableSizes = Array.from(this.pools.keys()).filter(s => s >= size).sort((a, b) => a - b);
    if (availableSizes.length > 0) {
      const closestSize = availableSizes[0];
      const closestPool = this.pools.get(closestSize);
      const closestStat = this.stats.get(closestSize);
      
      if (closestPool && closestPool.length > 0) {
        if (closestStat) closestStat.reused++;
        return closestPool.pop();
      }
    }
    
    // Create new array
    if (stat) stat.created++;
    return new this.arrayType(size);
  }

  return(array: any): void {
    const size = array.length;
    const pool = this.pools.get(size);
    
    if (pool && pool.length < this.maxPoolSize) {
      // Clear array data
      array.fill(0);
      pool.push(array);
    }
  }

  optimize(): void {
    this.pools.forEach((pool, size) => {
      // Keep only 50% of current pool size
      const targetSize = Math.floor(pool.length * 0.5);
      pool.splice(targetSize);
    });
  }

  clear(): void {
    this.pools.forEach(pool => pool.length = 0);
    this.stats.forEach(stat => {
      stat.created = 0;
      stat.reused = 0;
    });
  }

  getTotalSize(): number {
    let total = 0;
    this.pools.forEach(pool => total += pool.length);
    return total;
  }

  getStats(): TypedArrayPoolStats {
    const sizeStats = new Map<number, { poolSize: number; created: number; reused: number; reuseRate: number }>();
    
    this.pools.forEach((pool, size) => {
      const stat = this.stats.get(size)!;
      const total = stat.created + stat.reused;
      sizeStats.set(size, {
        poolSize: pool.length,
        created: stat.created,
        reused: stat.reused,
        reuseRate: total > 0 ? stat.reused / total : 0
      });
    });
    
    return {
      totalArrays: this.getTotalSize(),
      sizeStats: sizeStats
    };
  }
}

// Interfaces
export interface PoolStats {
  poolSize: number;
  maxSize: number;
  created: number;
  reused: number;
  reuseRate: number;
}

export interface TypedArrayPoolStats {
  totalArrays: number;
  sizeStats: Map<number, {
    poolSize: number;
    created: number;
    reused: number;
    reuseRate: number;
  }>;
}

export interface MemoryStats {
  memoryUsage: number;
  objectPools: Map<string, PoolStats>;
  typedArrayPools: Map<string, TypedArrayPoolStats>;
  lastGCTime: number;
  gcTriggerThreshold: number;
}

// Export singleton instance
export const memoryOptimizer = MemoryOptimizer.getInstance();