import * as fs from 'fs';
import * as path from 'path';
import NodeCache = require('node-cache');
import { EngineResult, ScrapeOptions } from '../models/index';

export interface CacheConfig {
  stdTTL: number; // Standard time to live in seconds
  checkperiod: number; // Check period for expired keys
  maxKeys: number; // Maximum number of keys
  persistInterval: number; // How often to persist to disk (ms)
  useClones: boolean; // Clone cached objects
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  expires: number;
  size: number;
  hits: number;
}

/**
 * Lightning-fast caching service with persistent file-backed storage
 * Supports all file formats and provides memory-accelerated access
 */
export class CacheService {
  private static instance: CacheService;
  private cache!: NodeCache;
  private isInitialized: boolean = false;
  private cacheDir: string = '';
  private cacheFile: string = '';
  private persistTimer?: NodeJS.Timeout;
  private config: CacheConfig = {
    stdTTL: 3600,
    checkperiod: 600,
    maxKeys: 10000,
    persistInterval: 30000,
    useClones: false
  };

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize cache service with configuration
   */
  async initialize(config?: Partial<CacheConfig>): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = { ...this.config, ...config };

    // Set cache directory
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.cacheFile = path.join(this.cacheDir, 'webcrawl-cache.json');
    
    try {
      // Ensure cache directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // Initialize node-cache with configuration
      this.cache = new NodeCache({
        stdTTL: this.config.stdTTL,
        checkperiod: this.config.checkperiod,
        useClones: this.config.useClones,
        deleteOnExpire: true,
        enableLegacyCallbacks: false,
        maxKeys: this.config.maxKeys
      });

      // Set up event listeners for cache operations
      this.setupEventListeners();

      // Load existing cache from disk
      await this.loadFromDisk();

      // Start periodic persistence
      this.startPeriodicPersistence();

      this.isInitialized = true;
      console.log(`🚀 CacheService initialized with persistent storage at: ${this.cacheDir}`);
      
      // Log initial cache stats
      const stats = this.cache.getStats();
      console.log(`📊 Cache stats - Keys: ${stats.keys}, Memory: ${this.formatBytes(stats.vsize)}`);
      
    } catch (error) {
      console.error('Failed to initialize CacheService:', error);
      throw error;
    }
  }

  /**
   * Load cache from disk
   */
  private async loadFromDisk(): Promise<void> {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const cacheData = JSON.parse(data);
        
        let loadedCount = 0;
        
        // Restore cache entries
        for (const [key, entry] of Object.entries(cacheData)) {
          const cacheEntry = entry as CacheEntry;
          
          // Check if entry has expired
          if (cacheEntry.expires > Date.now()) {
            // Calculate remaining TTL
            const remainingTTL = Math.max(0, Math.floor((cacheEntry.expires - Date.now()) / 1000));
            this.cache.set(key, cacheEntry.data, remainingTTL);
            loadedCount++;
          }
        }
        
        console.log(`📁 Loaded ${loadedCount} cache entries from disk`);
      }
    } catch (error) {
      console.error('Failed to load cache from disk:', error);
    }
  }

  /**
   * Save cache to disk
   */
  private async saveToDisk(): Promise<void> {
    try {
      const keys = this.cache.keys();
      const cacheData: Record<string, CacheEntry> = {};
      
      for (const key of keys) {
        const value = this.cache.get(key);
        const ttl = this.cache.getTtl(key);
        
        if (value !== undefined && ttl !== undefined) {
          cacheData[key] = {
            data: value,
            timestamp: Date.now(),
            ttl: ttl > 0 ? Math.floor((ttl - Date.now()) / 1000) : 0,
            expires: ttl || 0,
            size: JSON.stringify(value).length,
            hits: 0 // Reset hits on persistence
          };
        }
      }
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData), 'utf8');
      console.log(`💾 Saved ${Object.keys(cacheData).length} cache entries to disk`);
    } catch (error) {
      console.error('Failed to save cache to disk:', error);
    }
  }

  /**
   * Start periodic persistence
   */
  private startPeriodicPersistence(): void {
    this.persistTimer = setInterval(async () => {
      await this.saveToDisk();
    }, this.config.persistInterval);
  }

  /**
   * Set up event listeners for cache operations
   */
  private setupEventListeners(): void {
    this.cache.on('set', (key: string, value: any) => {
      console.log(`📝 Cache SET: ${key} (${this.formatBytes(JSON.stringify(value).length)})`);
    });

    this.cache.on('get', (key: string, value: any) => {
      if (value !== undefined) {
        console.log(`✅ Cache HIT: ${key}`);
      } else {
        console.log(`❌ Cache MISS: ${key}`);
      }
    });

    this.cache.on('del', (key: string, value: any) => {
      console.log(`🗑️ Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key: string, value: any) => {
      console.log(`⏰ Cache EXPIRED: ${key}`);
    });

    this.cache.on('flush', () => {
      console.log(`🧹 Cache FLUSHED`);
    });
  }

  /**
   * Cache a scrape result with smart TTL based on content type
   */
  async cacheScrapeResult(options: ScrapeOptions, result: EngineResult): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.generateScrapeKey(options);
    
    // Smart TTL based on content type and update frequency
    let ttl = 3600; // Default 1 hour
    
    if (result.meta['content-type']?.includes('application/pdf')) {
      ttl = 86400; // PDFs rarely change - 24 hours
    } else if (result.url.includes('/api/') || result.url.includes('/ajax/')) {
      ttl = 300; // API endpoints change frequently - 5 minutes
    } else if (result.text.length > 50000) {
      ttl = 7200; // Large content - 2 hours
    } else if (result.statusCode !== 200) {
      ttl = 60; // Error responses - 1 minute
    }

    this.cache.set(key, result, ttl);
    console.log(`🕷️ Cached scrape result: ${options.url} (TTL: ${ttl}s, Size: ${this.formatBytes(JSON.stringify(result).length)})`);
  }

  /**
   * Get cached scrape result
   */
  async getCachedScrapeResult(options: ScrapeOptions): Promise<EngineResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.generateScrapeKey(options);
    const result = this.cache.get<EngineResult>(key);
    
    if (result) {
      console.log(`⚡ Cache hit for: ${options.url}`);
      return result;
    }
    
    return null;
  }

  /**
   * Cache document parsing results (PDF, DOCX, etc.)
   */
  async cacheDocumentResult(url: string, contentType: string, result: EngineResult): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `doc:${this.hashString(url)}:${contentType}`;
    const ttl = 604800; // Documents rarely change - 7 days
    
    this.cache.set(key, result, ttl);
    console.log(`📄 Cached document: ${url} (Type: ${contentType}, Size: ${this.formatBytes(JSON.stringify(result).length)})`);
  }

  /**
   * Get cached document result
   */
  async getCachedDocumentResult(url: string, contentType: string): Promise<EngineResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `doc:${this.hashString(url)}:${contentType}`;
    const result = this.cache.get<EngineResult>(key);
    
    if (result) {
      console.log(`📋 Document cache hit: ${url}`);
      return result;
    }
    
    return null;
  }

  /**
   * Cache browser session data
   */
  async cacheBrowserSession(sessionId: string, data: any, ttl: number = 1800): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `session:${sessionId}`;
    this.cache.set(key, data, ttl);
    console.log(`🌐 Cached browser session: ${sessionId} (TTL: ${ttl}s)`);
  }

  /**
   * Get cached browser session
   */
  async getCachedBrowserSession(sessionId: string): Promise<any | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `session:${sessionId}`;
    const result = this.cache.get(key);
    
    if (result !== undefined) {
      return result;
    }
    
    return null;
  }

  /**
   * Cache dive/sitemap results
   */
  async cacheDiveResult(url: string, siteMap: any): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `dive:${this.hashString(url)}`;
    const ttl = 43200; // Sitemaps change infrequently - 12 hours
    
    this.cache.set(key, siteMap, ttl);
    console.log(`🗺️ Cached sitemap: ${url} (Pages: ${siteMap.pages?.length || 0})`);
  }

  /**
   * Get cached dive result
   */
  async getCachedDiveResult(url: string): Promise<any | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `dive:${this.hashString(url)}`;
    const result = this.cache.get(key);
    
    if (result !== undefined) {
      return result;
    }
    
    return null;
  }

  /**
   * Cache job results
   */
  async cacheJobResult(jobId: string, result: any, ttl: number = 7200): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `job:${jobId}`;
    this.cache.set(key, result, ttl);
    console.log(`⚙️ Cached job result: ${jobId} (TTL: ${ttl}s)`);
  }

  /**
   * Get cached job result
   */
  async getCachedJobResult(jobId: string): Promise<any | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `job:${jobId}`;
    const result = this.cache.get(key);
    
    if (result !== undefined) {
      return result;
    }
    
    return null;
  }

  /**
   * Generate cache key for scrape options
   */
  private generateScrapeKey(options: ScrapeOptions): string {
    const keyData = {
      url: options.url,
      engine: options.engine,
      screenshot: options.screenshot,
      fullPage: options.fullPage,
      userAgent: options.userAgent,
      viewport: options.viewport,
    };
    
    return `scrape:${this.hashString(JSON.stringify(keyData))}`;
  }

  /**
   * Simple hash function for generating cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get all cache keys
   */
  getAllKeys(): string[] {
    if (!this.isInitialized) {
      return [];
    }
    return this.cache.keys();
  }

  /**
   * Get cache value by key
   */
  getCacheValue(key: string): any {
    if (!this.isInitialized) {
      return undefined;
    }
    return this.cache.get(key);
  }

  /**
   * Delete cache entry by key
   */
  deleteCacheEntry(key: string): boolean {
    if (!this.isInitialized) {
      return false;
    }
    return this.cache.del(key) > 0;
  }

  /**
   * Clear specific cache by pattern
   */
  async clearCacheByPattern(pattern: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const keys = this.cache.keys();
    const matchingKeys = keys.filter((key: string) => key.includes(pattern));
    
    const deleted = this.cache.del(matchingKeys);
    console.log(`🧽 Cleared ${deleted} cache entries matching pattern: ${pattern}`);
    return deleted;
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.cache.flushAll();
    console.log(`🗑️ Cleared all cache entries`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    };
  }

  /**
   * Get detailed cache information
   */
  async getCacheInfo(): Promise<{
    stats: CacheStats;
    hitRate: number;
    memoryUsage: string;
    totalRequests: number;
    cacheDir: string;
    isInitialized: boolean;
  }> {
    const stats = await this.getStats();
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;

    return {
      stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.formatBytes(stats.vsize),
      totalRequests,
      cacheDir: this.cacheDir,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const allKeys = this.cache.keys();
      const matchingKeys = allKeys.filter(key => {
        // Simple pattern matching with * as wildcard
        const regexPattern = pattern.replace(/\*/g, '.*');
        return new RegExp(regexPattern).test(key);
      });
      
      return matchingKeys;
    } catch (error) {
      console.error(`Error getting keys by pattern ${pattern}:`, error);
      return [];
    }
  }
  
  /**
   * Get raw value from cache by key
   */
  async getRawValue(key: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.cache.get(key);
  }

  /**
   * Check if cache is healthy and operational
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Test cache operations
      const testKey = 'health-check';
      const testValue = { timestamp: Date.now() };
      
      this.cache.set(testKey, testValue, 10);
      const retrieved = this.cache.get(testKey);
      this.cache.del(testKey);
      
      return retrieved !== undefined;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup and close cache service
   */
  async cleanup(): Promise<void> {
    if (this.isInitialized) {
      // Clear timer
      if (this.persistTimer) {
        clearInterval(this.persistTimer);
      }
      
      // Save final state to disk
      await this.saveToDisk();
      
      // Close the cache
      this.cache.close();
      this.isInitialized = false;
      console.log('🔒 CacheService cleanup completed');
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
