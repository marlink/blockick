/**
 * Resource Pre-loading Strategy with LRU Caching and Priority-based Loading
 * Optimizes asset loading and memory management for grass texture system
 */
import { performanceMonitor } from '../utils/performanceMonitor';

export class ResourceManager {
  private static instance: ResourceManager;
  private cache: LRUCache<string, any>;
  private loadingQueue: PriorityQueue<LoadTask>;
  private isLoading: boolean = false;
  private loadedResources: Map<string, ResourceInfo> = new Map();
  private preloadPromises: Map<string, Promise<any>> = new Map();
  private maxConcurrentLoads: number = 3;
  private activeLoads: number = 0;

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  constructor() {
    this.cache = new LRUCache<string, any>(50); // 50 item cache
    this.loadingQueue = new PriorityQueue<LoadTask>();
    this.initializeResourceTracking();
  }

  /**
   * Initialize resource tracking and monitoring
   */
  private initializeResourceTracking(): void {
    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryPressure();
    }, 10000); // Check every 10 seconds

    console.log('📦 Resource Manager initialized');
  }

  /**
   * Pre-load critical assets with priority-based loading
   */
  async preloadCriticalAssets(scene: Phaser.Scene): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🚀 Starting critical asset preload...');
      
      // Define critical assets with priorities
      const criticalAssets: LoadTask[] = [
        {
          id: 'grass_atlas_base',
          priority: Priority.CRITICAL,
          type: 'texture',
          loader: () => this.preloadGrassAtlas(scene),
          size: 16 * 1024 * 1024, // 16MB estimated
          dependencies: []
        },
        {
          id: 'grass_shader',
          priority: Priority.HIGH,
          type: 'shader',
          loader: () => this.preloadShaderPrograms(scene),
          size: 1024, // 1KB estimated
          dependencies: ['grass_atlas_base']
        },
        {
          id: 'performance_monitor',
          priority: Priority.MEDIUM,
          type: 'system',
          loader: () => this.initializePerformanceMonitoring(),
          size: 512, // 512B estimated
          dependencies: []
        }
      ];

      // Add tasks to priority queue
      criticalAssets.forEach(task => {
        this.loadingQueue.enqueue(task);
      });

      // Process loading queue
      await this.processLoadingQueue();
      
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordMetric('critical_assets_load_time', loadTime);
      
      console.log(`✅ Critical assets preloaded in ${loadTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Critical asset preload failed:', error);
      throw error;
    }
  }

  /**
   * Process loading queue with concurrency control
   */
  private async processLoadingQueue(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    while (!this.loadingQueue.isEmpty() || this.activeLoads > 0) {
      // Start new loads if under concurrency limit
      while (this.activeLoads < this.maxConcurrentLoads && !this.loadingQueue.isEmpty()) {
        const task = this.loadingQueue.dequeue()!;
        
        // Check dependencies
        if (this.areDependenciesMet(task.dependencies)) {
          const loadPromise = this.executeLoadTask(task);
          loadPromises.push(loadPromise);
        } else {
          // Re-queue task if dependencies not met
          this.loadingQueue.enqueue(task);
          break;
        }
      }

      // Wait for at least one load to complete
      if (this.activeLoads > 0) {
        await Promise.race(loadPromises.filter(p => p));
      }
    }

    // Wait for all remaining loads
    await Promise.all(loadPromises);
  }

  /**
   * Execute individual load task
   */
  private async executeLoadTask(task: LoadTask): Promise<void> {
    this.activeLoads++;
    const startTime = performance.now();
    
    try {
      console.log(`📥 Loading ${task.id} (Priority: ${Priority[task.priority]})`);
      
      const result = await task.loader();
      
      // Cache the result
      this.cache.set(task.id, result);
      
      // Track resource info
      const loadTime = performance.now() - startTime;
      this.loadedResources.set(task.id, {
        id: task.id,
        type: task.type,
        size: task.size,
        loadTime: loadTime,
        lastAccessed: Date.now(),
        accessCount: 0
      });
      
      performanceMonitor.recordMetric(`load_time_${task.id}`, loadTime);
      
      console.log(`✅ Loaded ${task.id} in ${loadTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`❌ Failed to load ${task.id}:`, error);
      throw error;
    } finally {
      this.activeLoads--;
    }
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every(dep => this.loadedResources.has(dep));
  }

  /**
   * Pre-load grass atlas texture
   */
  private async preloadGrassAtlas(scene: Phaser.Scene): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Generate atlas content (simplified for preload)
        this.generateAtlasContent(ctx, canvas.width, canvas.height);
        
        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate atlas content for preloading
   */
  private generateAtlasContent(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const tileSize = width / 4;
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const seed = row * 4 + col;
        
        this.generatePreloadTile(ctx, x, y, tileSize, seed);
      }
    }
  }

  /**
   * Generate simplified tile for preloading
   */
  private generatePreloadTile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
    const rng = this.seededRandom(seed);
    
    // Base gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, '#2d5016');
    gradient.addColorStop(1, '#5d8c2a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    
    // Simplified grass pattern
    ctx.strokeStyle = '#4a7c23';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 200; i++) {
      const bladeX = x + rng() * size;
      const bladeY = y + rng() * size;
      const length = 5 + rng() * 10;
      
      ctx.beginPath();
      ctx.moveTo(bladeX, bladeY);
      ctx.lineTo(bladeX + (rng() - 0.5) * 4, bladeY - length);
      ctx.stroke();
    }
  }

  /**
   * Pre-load shader programs
   */
  private async preloadShaderPrograms(scene: Phaser.Scene): Promise<string[]> {
    return new Promise((resolve) => {
      const shaders = [
        'grass_enhancement_vertex',
        'grass_enhancement_fragment',
        'wind_animation_fragment'
      ];
      
      // Simulate shader compilation
      setTimeout(() => {
        console.log('🎨 Shader programs compiled');
        resolve(shaders);
      }, 100);
    });
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    return new Promise((resolve) => {
      performanceMonitor.startMonitoring();
      console.log('📊 Performance monitoring initialized');
      resolve();
    });
  }

  /**
   * Get resource from cache with access tracking
   */
  getResource<T>(id: string): T | null {
    const resource = this.cache.get(id);
    
    if (resource && this.loadedResources.has(id)) {
      const info = this.loadedResources.get(id)!;
      info.lastAccessed = Date.now();
      info.accessCount++;
    }
    
    return resource as T || null;
  }

  /**
   * Check memory pressure and optimize cache
   */
  private checkMemoryPressure(): void {
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const memoryThreshold = 100; // 100MB threshold
    
    if (memoryUsage > memoryThreshold) {
      console.log(`⚠️ Memory pressure detected: ${memoryUsage.toFixed(2)}MB`);
      this.optimizeCache();
    }
  }

  /**
   * Optimize cache by removing least recently used items
   */
  private optimizeCache(): void {
    const itemsToRemove = Math.floor(this.cache.size * 0.2); // Remove 20% of items
    
    // Sort by last accessed time
    const sortedResources = Array.from(this.loadedResources.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    for (let i = 0; i < itemsToRemove && i < sortedResources.length; i++) {
      const resource = sortedResources[i];
      this.cache.delete(resource.id);
      this.loadedResources.delete(resource.id);
      console.log(`🗑️ Removed ${resource.id} from cache`);
    }
    
    // Force garbage collection
    performanceMonitor.forceGarbageCollection();
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.cache.maxSize,
      hitRate: this.cache.hitRate,
      memoryUsage: performanceMonitor.getMemoryUsage(),
      loadedResources: this.loadedResources.size,
      activeLoads: this.activeLoads
    };
  }

  /**
   * Clear all cached resources
   */
  clearCache(): void {
    this.cache.clear();
    this.loadedResources.clear();
    console.log('🧹 Resource cache cleared');
  }

  /**
   * Destroy resource manager
   */
  destroy(): void {
    this.clearCache();
    this.preloadPromises.clear();
    console.log('🧹 Resource Manager destroyed');
  }
}

/**
 * LRU Cache implementation
 */
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private accessOrder: K[] = [];
  public maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      this.updateAccessOrder(key);
      this.hits++;
      return this.cache.get(key);
    }
    this.misses++;
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.updateAccessOrder(key);
    } else {
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      this.cache.set(key, value);
      this.accessOrder.push(key);
    }
  }

  delete(key: K): boolean {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return true;
    }
    return false;
  }

  private updateAccessOrder(key: K): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      this.cache.delete(lruKey);
    }
  }

  get size(): number {
    return this.cache.size;
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Priority Queue implementation
 */
class PriorityQueue<T extends { priority: Priority }> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

// Enums and Interfaces
export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface LoadTask {
  id: string;
  priority: Priority;
  type: string;
  loader: () => Promise<any>;
  size: number; // Estimated size in bytes
  dependencies: string[];
}

export interface ResourceInfo {
  id: string;
  type: string;
  size: number;
  loadTime: number;
  lastAccessed: number;
  accessCount: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
  loadedResources: number;
  activeLoads: number;
}

// Export singleton instance
export const resourceManager = ResourceManager.getInstance();