/**
 * Comprehensive Error Handling System
 * Provides fallback rendering paths, detailed logging, and recovery mechanisms
 */
import { performanceMonitor } from './performanceMonitor';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorLogEntry[] = [];
  private maxLogEntries: number = 1000;
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private errorCallbacks: Map<ErrorSeverity, Array<(error: ErrorInfo) => void>> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts: number = 3;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  constructor() {
    this.initializeErrorCallbacks();
    this.initializeFallbackStrategies();
    this.setupGlobalErrorHandling();
    console.log('🛡️ Error Handler initialized');
  }

  /**
   * Initialize error callbacks for different severity levels
   */
  private initializeErrorCallbacks(): void {
    this.errorCallbacks.set(ErrorSeverity.LOW, []);
    this.errorCallbacks.set(ErrorSeverity.MEDIUM, []);
    this.errorCallbacks.set(ErrorSeverity.HIGH, []);
    this.errorCallbacks.set(ErrorSeverity.CRITICAL, []);
  }

  /**
   * Initialize fallback strategies for different components
   */
  private initializeFallbackStrategies(): void {
    // Atlas texture loading fallback
    this.registerFallbackStrategy('atlas_texture_load', {
      name: 'atlas_texture_load',
      description: 'Fallback to procedural texture generation when atlas fails to load',
      execute: async (context: any) => {
        console.log('🔄 Executing atlas texture fallback...');
        return this.generateFallbackTexture(context.scene, context.width, context.height);
      },
      priority: 1
    });

    // Shader compilation fallback
    this.registerFallbackStrategy('shader_compilation', {
      name: 'shader_compilation',
      description: 'Fallback to basic rendering when shader compilation fails',
      execute: async (context: any) => {
        console.log('🔄 Executing shader compilation fallback...');
        return this.createBasicRenderer(context.scene);
      },
      priority: 2
    });

    // Memory allocation fallback
    this.registerFallbackStrategy('memory_allocation', {
      name: 'memory_allocation',
      description: 'Reduce quality settings when memory allocation fails',
      execute: async (context: any) => {
        console.log('🔄 Executing memory allocation fallback...');
        return this.reduceQualitySettings(context);
      },
      priority: 3
    });

    // Performance degradation fallback
    this.registerFallbackStrategy('performance_degradation', {
      name: 'performance_degradation',
      description: 'Optimize rendering when performance drops below threshold',
      execute: async (context: any) => {
        console.log('🔄 Executing performance degradation fallback...');
        return this.optimizeForPerformance(context);
      },
      priority: 4
    });
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        ErrorSeverity.HIGH,
        'global',
        { reason: event.reason }
      );
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(`Global Error: ${event.message}`),
        ErrorSeverity.MEDIUM,
        'global',
        { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });
  }

  /**
   * Main error handling method
   */
  async handleError(
    error: Error,
    severity: ErrorSeverity,
    component: string,
    context?: any,
    fallbackKey?: string
  ): Promise<any> {
    const errorInfo: ErrorInfo = {
      error,
      severity,
      component,
      context,
      timestamp: Date.now(),
      id: this.generateErrorId()
    };

    // Log the error
    this.logError(errorInfo);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(component)) {
      console.warn(`⚡ Circuit breaker open for ${component}, skipping operation`);
      return null;
    }

    // Record performance impact
    performanceMonitor.recordMetric(`error_${severity}_${component}`, 1);

    // Execute error callbacks
    this.executeErrorCallbacks(errorInfo);

    // Attempt recovery with fallback strategy
    if (fallbackKey) {
      try {
        const result = await this.executeFallbackStrategy(fallbackKey, context);
        console.log(`✅ Fallback strategy '${fallbackKey}' executed successfully`);
        return result;
      } catch (fallbackError) {
        console.error(`❌ Fallback strategy '${fallbackKey}' failed:`, fallbackError);
        this.updateCircuitBreaker(component, false);
      }
    }

    // Handle critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(errorInfo);
    }

    return null;
  }

  /**
   * Execute fallback strategy with retry logic
   */
  private async executeFallbackStrategy(key: string, context: any): Promise<any> {
    const strategy = this.fallbackStrategies.get(key);
    if (!strategy) {
      throw new Error(`Fallback strategy '${key}' not found`);
    }

    const retryKey = `${key}_${JSON.stringify(context)}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    if (currentAttempts >= this.maxRetryAttempts) {
      throw new Error(`Max retry attempts (${this.maxRetryAttempts}) exceeded for ${key}`);
    }

    try {
      this.retryAttempts.set(retryKey, currentAttempts + 1);
      const result = await strategy.execute(context);
      
      // Reset retry count on success
      this.retryAttempts.delete(retryKey);
      
      return result;
    } catch (error) {
      console.error(`❌ Fallback strategy '${key}' attempt ${currentAttempts + 1} failed:`, error);
      
      if (currentAttempts + 1 >= this.maxRetryAttempts) {
        this.retryAttempts.delete(retryKey);
      }
      
      throw error;
    }
  }

  /**
   * Generate fallback texture when atlas loading fails
   */
  private async generateFallbackTexture(scene: any, width: number, height: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context for fallback texture');
    }

    // Create simple grass pattern
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2d5016');
    gradient.addColorStop(0.5, '#4a7c23');
    gradient.addColorStop(1, '#5d8c2a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add simple texture pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, 1, 1);
    }
    
    console.log('🎨 Generated fallback texture');
    return canvas;
  }

  /**
   * Create basic renderer when shader compilation fails
   */
  private async createBasicRenderer(scene: any): Promise<any> {
    return {
      type: 'basic',
      render: (x: number, y: number, width: number, height: number) => {
        // Basic canvas-based rendering
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x4a7c23);
        graphics.fillRect(x, y, width, height);
        return graphics;
      }
    };
  }

  /**
   * Reduce quality settings when memory allocation fails
   */
  private async reduceQualitySettings(context: any): Promise<any> {
    const reducedSettings = {
      atlasSize: Math.max(512, (context.atlasSize || 2048) / 2),
      grassDensity: Math.max(0.1, (context.grassDensity || 1.0) * 0.5),
      windComplexity: Math.max(1, (context.windComplexity || 3) - 1),
      layerCount: Math.max(1, (context.layerCount || 3) - 1)
    };
    
    console.log('📉 Reduced quality settings:', reducedSettings);
    return reducedSettings;
  }

  /**
   * Optimize for performance when degradation is detected
   */
  private async optimizeForPerformance(context: any): Promise<any> {
    const optimizations = {
      enableBatching: true,
      reduceParticles: true,
      simplifyShaders: true,
      lowerFrameRate: true,
      disableNonEssentialEffects: true
    };
    
    console.log('⚡ Applied performance optimizations:', optimizations);
    return optimizations;
  }

  /**
   * Handle critical errors that require immediate attention
   */
  private handleCriticalError(errorInfo: ErrorInfo): void {
    console.error('🚨 CRITICAL ERROR DETECTED:', errorInfo);
    
    // Send critical error notification
    this.sendCriticalErrorNotification(errorInfo);
    
    // Attempt graceful degradation
    this.attemptGracefulDegradation(errorInfo.component);
  }

  /**
   * Send critical error notification
   */
  private sendCriticalErrorNotification(errorInfo: ErrorInfo): void {
    // In a real application, this would send to monitoring service
    console.error('📧 Critical error notification:', {
      id: errorInfo.id,
      component: errorInfo.component,
      message: errorInfo.error.message,
      timestamp: new Date(errorInfo.timestamp).toISOString()
    });
  }

  /**
   * Attempt graceful degradation for critical errors
   */
  private attemptGracefulDegradation(component: string): void {
    switch (component) {
      case 'atlas_texture':
        console.log('🔄 Attempting graceful degradation: switching to basic background');
        break;
      case 'shader_system':
        console.log('🔄 Attempting graceful degradation: disabling advanced effects');
        break;
      case 'memory_system':
        console.log('🔄 Attempting graceful degradation: clearing caches and reducing quality');
        break;
      default:
        console.log(`🔄 Attempting graceful degradation for ${component}`);
    }
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitBreakerOpen(component: string): boolean {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return false;
    
    const now = Date.now();
    if (breaker.state === 'open' && now - breaker.lastFailure > breaker.timeout) {
      breaker.state = 'half-open';
      console.log(`🔄 Circuit breaker for ${component} moved to half-open state`);
    }
    
    return breaker.state === 'open';
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(component: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(component);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailure: 0,
        threshold: 5,
        timeout: 60000 // 1 minute
      };
      this.circuitBreakers.set(component, breaker);
    }
    
    if (success) {
      breaker.failureCount = 0;
      breaker.state = 'closed';
    } else {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failureCount >= breaker.threshold) {
        breaker.state = 'open';
        console.warn(`⚡ Circuit breaker opened for ${component} after ${breaker.failureCount} failures`);
      }
    }
  }

  /**
   * Log error with contextual information
   */
  private logError(errorInfo: ErrorInfo): void {
    const logEntry: ErrorLogEntry = {
      ...errorInfo,
      stackTrace: errorInfo.error.stack || 'No stack trace available',
      userAgent: navigator.userAgent,
      url: window.location.href,
      memoryUsage: performanceMonitor.getMemoryUsage(),
      fps: performanceMonitor.getCurrentFPS()
    };
    
    this.errorLog.push(logEntry);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog.splice(0, this.errorLog.length - this.maxLogEntries);
    }
    
    // Console logging with appropriate level
    const logMessage = `[${ErrorSeverity[errorInfo.severity]}] ${errorInfo.component}: ${errorInfo.error.message}`;
    
    switch (errorInfo.severity) {
      case ErrorSeverity.LOW:
        console.info('ℹ️', logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️', logMessage);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌', logMessage);
        break;
      case ErrorSeverity.CRITICAL:
        console.error('🚨', logMessage);
        break;
    }
  }

  /**
   * Execute error callbacks for specific severity
   */
  private executeErrorCallbacks(errorInfo: ErrorInfo): void {
    const callbacks = this.errorCallbacks.get(errorInfo.severity);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(errorInfo);
        } catch (error) {
          console.error('❌ Error callback failed:', error);
        }
      });
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register fallback strategy
   */
  registerFallbackStrategy(key: string, strategy: FallbackStrategy): void {
    this.fallbackStrategies.set(key, strategy);
    console.log(`📋 Registered fallback strategy: ${key}`);
  }

  /**
   * Register error callback
   */
  onError(severity: ErrorSeverity, callback: (error: ErrorInfo) => void): void {
    const callbacks = this.errorCallbacks.get(severity) || [];
    callbacks.push(callback);
    this.errorCallbacks.set(severity, callbacks);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const severityCounts = new Map<ErrorSeverity, number>();
    const componentCounts = new Map<string, number>();
    
    this.errorLog.forEach(entry => {
      // Count by severity
      const severityCount = severityCounts.get(entry.severity) || 0;
      severityCounts.set(entry.severity, severityCount + 1);
      
      // Count by component
      const componentCount = componentCounts.get(entry.component) || 0;
      componentCounts.set(entry.component, componentCount + 1);
    });
    
    return {
      totalErrors: this.errorLog.length,
      severityCounts,
      componentCounts,
      recentErrors: this.errorLog.slice(-10),
      circuitBreakerStates: new Map(this.circuitBreakers)
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    console.log('🧹 Error log cleared');
  }

  /**
   * Export error log for analysis
   */
  exportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }

  /**
   * Destroy error handler
   */
  destroy(): void {
    this.errorLog = [];
    this.fallbackStrategies.clear();
    this.errorCallbacks.clear();
    this.retryAttempts.clear();
    this.circuitBreakers.clear();
    console.log('🧹 Error Handler destroyed');
  }
}

// Enums and Interfaces
export enum ErrorSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface ErrorInfo {
  error: Error;
  severity: ErrorSeverity;
  component: string;
  context?: any;
  timestamp: number;
  id: string;
}

export interface ErrorLogEntry extends ErrorInfo {
  stackTrace: string;
  userAgent: string;
  url: string;
  memoryUsage: number;
  fps: number;
}

export interface FallbackStrategy {
  name: string;
  description: string;
  execute: (context: any) => Promise<any>;
  priority: number;
}

export interface CircuitBreaker {
  state: 'open' | 'closed' | 'half-open';
  failureCount: number;
  lastFailure: number;
  threshold: number;
  timeout: number;
}

export interface ErrorStats {
  totalErrors: number;
  severityCounts: Map<ErrorSeverity, number>;
  componentCounts: Map<string, number>;
  recentErrors: ErrorLogEntry[];
  circuitBreakerStates: Map<string, CircuitBreaker>;
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();