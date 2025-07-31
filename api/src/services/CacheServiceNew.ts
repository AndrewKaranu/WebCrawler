import * as fs from 'fs';
import * as path from 'path';
import { EngineResult, ScrapeOptions } from '../models/index';

export interface CacheConfig {
  stdTTL: number; // Standard time to live in seconds
  checkperiod: number; // Check period for expired keys
  maxKeys: number; // Maximum number of keys
  persistInterval: number; // How often to persist to disk (ms)
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
  private cache: Map<string, CacheEntry> = new Map();
  private isInitialized: boolean = false;
  private cacheDir: string = '';
  private cacheFile: string = '';
  private persistTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private stats: CacheStats = {
    keys: 0,
    hits: 0,
    misses: 0,
    ksize: 0,
    vsize: 0
  };
  private config: CacheConfig = {
    stdTTL: 3600,
    checkperiod: 600,
    maxKeys: 10000,
    persistInterval: 30000
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

      // Load existing cache from disk
      await this.loadFromDisk();

      // Start periodic tasks
      this.startPeriodicTasks();

      this.isInitialized = true;
      console.log(`🚀 CacheService initialized with persistent storage at: ${this.cacheDir}`);
      
      // Log initial cache stats
      const stats = await this.getStats();
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
        
        // Restore cache entries
        for (const [key, entry] of Object.entries(cacheData)) {
          const cacheEntry = entry as CacheEntry;
          
          // Check if entry has expired
          if (cacheEntry.expires > Date.now()) {
            this.cache.set(key, cacheEntry);
          }
        }
        
        console.log(`📁 Loaded ${this.cache.size} cache entries from disk`);
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
      const cacheData: Record<string, CacheEntry> = {};
      
      for (const [key, entry] of this.cache.entries()) {
        cacheData[key] = entry;
      }
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData), 'utf8');
      console.log(`💾 Saved ${this.cache.size} cache entries to disk`);
    } catch (error) {
      console.error('Failed to save cache to disk:', error);
    }
  }

  /**
   * Start periodic tasks (cleanup and persistence)
   */
  private startPeriodicTasks(): void {
    // Periodic persistence
    this.persistTimer = setInterval(async () => {
      await this.saveToDisk();
    }, this.config.persistInterval);

    // Periodic cleanup of expired entries
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.checkperiod * 1000);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);
      this.updateStats();
    }
  }

  /**
   * Update internal statistics
   */
  private updateStats(): void {
    this.stats.keys = this.cache.size;
    this.stats.ksize = this.cache.size;
    
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    this.stats.vsize = totalSize;
  }

  /**
   * Set cache entry
   */
  private setEntry<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.config.stdTTL;
    const expires = now + (entryTTL * 1000);
    
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTTL,
      expires,
      size: JSON.stringify(data).length,
      hits: 0
    };

    // Check max keys limit
    if (this.cache.size >= this.config.maxKeys && !this.cache.has(key)) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, cacheEntry);
    this.updateStats();
    
    console.log(`📝 Cache SET: ${key} (TTL: ${entryTTL}s, Size: ${this.formatBytes(cacheEntry.size)})`);
  }

  /**
   * Get cache entry
   */
  private getEntry<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    }

    // Check if expired
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;
    this.cache.set(key, entry); // Update the entry
    
    console.log(`✅ Cache HIT: ${key} (hits: ${entry.hits})`);
    return entry.data as T;
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

    this.setEntry(key, result, ttl);
    console.log(`🕷️ Cached scrape result: ${options.url}`);
  }

  /**
   * Get cached scrape result
   */
  async getCachedScrapeResult(options: ScrapeOptions): Promise<EngineResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.generateScrapeKey(options);
    return this.getEntry<EngineResult>(key);
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
    
    this.setEntry(key, result, ttl);
    console.log(`📄 Cached document: ${url} (Type: ${contentType})`);
  }

  /**
   * Get cached document result
   */
  async getCachedDocumentResult(url: string, contentType: string): Promise<EngineResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `doc:${this.hashString(url)}:${contentType}`;
    return this.getEntry<EngineResult>(key);
  }

  /**
   * Cache browser session data
   */
  async cacheBrowserSession(sessionId: string, data: any, ttl: number = 1800): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `session:${sessionId}`;
    this.setEntry(key, data, ttl);
    console.log(`🌐 Cached browser session: ${sessionId}`);
  }

  /**
   * Get cached browser session
   */
  async getCachedBrowserSession(sessionId: string): Promise<any | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `session:${sessionId}`;
    return this.getEntry(key);
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
    
    this.setEntry(key, siteMap, ttl);
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
    return this.getEntry(key);
  }

  /**
   * Cache job results
   */
  async cacheJobResult(jobId: string, result: any, ttl: number = 7200): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `job:${jobId}`;
    this.setEntry(key, result, ttl);
    console.log(`⚙️ Cached job result: ${jobId}`);
  }

  /**
   * Get cached job result
   */
  async getCachedJobResult(jobId: string): Promise<any | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `job:${jobId}`;
    return this.getEntry(key);
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
   * Clear specific cache by pattern
   */
  async clearCacheByPattern(pattern: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const keys = Array.from(this.cache.keys());
    const matchingKeys = keys.filter((key: string) => key.includes(pattern));
    
    let deleted = 0;
    for (const key of matchingKeys) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }
    
    this.updateStats();
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

    this.cache.clear();
    this.updateStats();
    console.log(`🗑️ Cleared all cache entries`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.updateStats();
    return { ...this.stats };
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
      
      this.setEntry(testKey, testValue, 10);
      const retrieved = this.getEntry(testKey);
      this.cache.delete(testKey);
      
      return retrieved !== null;
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
      // Clear timers
      if (this.persistTimer) {
        clearInterval(this.persistTimer);
      }
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
      
      // Save final state to disk
      await this.saveToDisk();
      
      // Clear cache
      this.cache.clear();
      this.isInitialized = false;
      console.log('🔒 CacheService cleanup completed');
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
