import { cacheService } from './CacheService';
import { ScrapeOptions, EngineResult } from '../models/index';

/**
 * JobCacheService: Dedicated caching layer for job queue operations
 * 
 * This service integrates with the job queue system to cache results from:
 * - Individual scrape jobs
 * - Batch scrape jobs  
 * - Mass scraper operations
 * - Dive/crawl operations
 * 
 * It provides lightning-fast job processing by checking cache before
 * executing actual scraping operations.
 */
export class JobCacheService {
  private static instance: JobCacheService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JobCacheService {
    if (!JobCacheService.instance) {
      JobCacheService.instance = new JobCacheService();
    }
    return JobCacheService.instance;
  }

  /**
   * Initialize the job cache service
   */
  async initialize(): Promise<void> {
    await cacheService.initialize({
      stdTTL: 3600,      // 1 hour default TTL
      checkperiod: 600,   // Check every 10 minutes for expired keys
      maxKeys: 50000,     // Allow more keys for job operations
      persistInterval: 15000, // Persist every 15 seconds for job data
      useClones: false    // Better performance for large job results
    });
    
    console.log('🚀 JobCacheService initialized');
  }

  /**
   * Check cache before processing scrape job
   * Returns cached result if available, null if cache miss
   */
  async checkScrapeJobCache(jobData: { url: string; options: ScrapeOptions }): Promise<EngineResult | null> {
    try {
      const { url, options } = jobData;
      const scrapeOptions: ScrapeOptions = { ...options, url };
      
      const cachedResult = await cacheService.getCachedScrapeResult(scrapeOptions);
      
      if (cachedResult) {
        console.log(`🚀 Job Cache HIT for scrape job: ${url}`);
        return cachedResult;
      }
      
      console.log(`💨 Job Cache MISS for scrape job: ${url}`);
      return null;
    } catch (error) {
      console.error('Error checking scrape job cache:', error);
      return null;
    }
  }

  /**
   * Cache the result of a completed scrape job
   */
  async cacheScrapeJobResult(jobData: { url: string; options: ScrapeOptions }, result: EngineResult): Promise<void> {
    try {
      const { url, options } = jobData;
      const scrapeOptions: ScrapeOptions = { ...options, url };
      
      await cacheService.cacheScrapeResult(scrapeOptions, result);
      console.log(`💾 Cached scrape job result: ${url}`);
    } catch (error) {
      console.error('Error caching scrape job result:', error);
    }
  }

  /**
   * Check cache for batch scrape operations
   * Returns array with cache hits and misses identified
   */
  async checkBatchScrapeCache(urls: string[], options: ScrapeOptions): Promise<{
    cacheHits: { url: string; result: EngineResult }[];
    cacheMisses: string[];
    hitRate: number;
  }> {
    const cacheHits: { url: string; result: EngineResult }[] = [];
    const cacheMisses: string[] = [];
    
    console.log(`🔍 Checking batch cache for ${urls.length} URLs...`);
    
    for (const url of urls) {
      try {
        const scrapeOptions: ScrapeOptions = { ...options, url };
        const cachedResult = await cacheService.getCachedScrapeResult(scrapeOptions);
        
        if (cachedResult) {
          cacheHits.push({ url, result: cachedResult });
        } else {
          cacheMisses.push(url);
        }
      } catch (error) {
        console.error(`Error checking cache for ${url}:`, error);
        cacheMisses.push(url); // Treat errors as cache misses
      }
    }
    
    const hitRate = urls.length > 0 ? (cacheHits.length / urls.length) * 100 : 0;
    
    console.log(`📊 Batch cache check: ${cacheHits.length} hits, ${cacheMisses.length} misses, ${hitRate.toFixed(1)}% hit rate`);
    
    return { cacheHits, cacheMisses, hitRate };
  }

  /**
   * Cache batch scrape results
   */
  async cacheBatchScrapeResults(results: EngineResult[], options: ScrapeOptions): Promise<void> {
    console.log(`💾 Caching ${results.length} batch scrape results...`);
    
    const cachePromises = results.map(async (result) => {
      try {
        const scrapeOptions: ScrapeOptions = { ...options, url: result.url };
        await cacheService.cacheScrapeResult(scrapeOptions, result);
      } catch (error) {
        console.error(`Error caching result for ${result.url}:`, error);
      }
    });
    
    await Promise.all(cachePromises);
    console.log(`✅ Cached ${results.length} batch results`);
  }

  /**
   * Check cache for dive/crawl operations
   */
  async checkDiveJobCache(url: string): Promise<any | null> {
    try {
      const cachedResult = await cacheService.getCachedDiveResult(url);
      
      if (cachedResult) {
        console.log(`🚀 Job Cache HIT for dive job: ${url}`);
        return cachedResult;
      }
      
      console.log(`💨 Job Cache MISS for dive job: ${url}`);
      return null;
    } catch (error) {
      console.error('Error checking dive job cache:', error);
      return null;
    }
  }

  /**
   * Cache dive/crawl job results
   */
  async cacheDiveJobResult(url: string, siteMap: any): Promise<void> {
    try {
      await cacheService.cacheDiveResult(url, siteMap);
      console.log(`💾 Cached dive job result: ${url}`);
    } catch (error) {
      console.error('Error caching dive job result:', error);
    }
  }

  /**
   * Cache any job result by job ID
   */
  async cacheJobResult(jobId: string, result: any, ttl?: number): Promise<void> {
    try {
      await cacheService.cacheJobResult(jobId, result, ttl);
      console.log(`💾 Cached job result: ${jobId}`);
    } catch (error) {
      console.error('Error caching job result:', error);
    }
  }

  /**
   * Get cached job result by job ID
   */
  async getCachedJobResult(jobId: string): Promise<any | null> {
    try {
      const result = await cacheService.getCachedJobResult(jobId);
      
      if (result) {
        console.log(`🚀 Job Cache HIT for job: ${jobId}`);
      } else {
        console.log(`💨 Job Cache MISS for job: ${jobId}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error getting cached job result:', error);
      return null;
    }
  }

  /**
   * Pre-warm cache for upcoming job operations
   */
  async prewarmJobCache(urls: string[], options: ScrapeOptions): Promise<{
    prewarmed: number;
    skipped: number;
    failed: number;
  }> {
    console.log(`🔥 Pre-warming job cache for ${urls.length} URLs...`);
    
    let prewarmed = 0;
    let skipped = 0;
    let failed = 0;
    
    // Check which URLs are already cached
    for (const url of urls) {
      try {
        const scrapeOptions: ScrapeOptions = { ...options, url };
        const cached = await cacheService.getCachedScrapeResult(scrapeOptions);
        
        if (cached) {
          skipped++;
        } else {
          // Mark for pre-warming (we don't actually scrape here, just mark priority)
          prewarmed++;
        }
      } catch (error) {
        console.error(`Error checking pre-warm cache for ${url}:`, error);
        failed++;
      }
    }
    
    console.log(`🔥 Pre-warm check: ${prewarmed} to warm, ${skipped} already cached, ${failed} failed`);
    
    return { prewarmed, skipped, failed };
  }

  /**
   * Get job cache statistics
   */
  async getJobCacheStats(): Promise<{
    stats: any;
    hitRate: number;
    memoryUsage: string;
    totalRequests: number;
    jobSpecificKeys: number;
  }> {
    try {
      const cacheInfo = await cacheService.getCacheInfo();
      
      // Count job-specific cache keys
      const stats = await cacheService.getStats();
      const jobSpecificKeys = stats.keys; // All keys are job-related in this service
      
      return {
        stats: cacheInfo.stats,
        hitRate: cacheInfo.hitRate,
        memoryUsage: cacheInfo.memoryUsage,
        totalRequests: cacheInfo.totalRequests,
        jobSpecificKeys
      };
    } catch (error) {
      console.error('Error getting job cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear job cache by pattern
   */
  async clearJobCache(pattern?: string): Promise<{ cleared: number }> {
    try {
      if (pattern) {
        const cleared = await cacheService.clearCacheByPattern(pattern);
        console.log(`🧹 Cleared ${cleared} job cache entries matching pattern: ${pattern}`);
        return { cleared };
      } else {
        await cacheService.clearAllCache();
        console.log('🧹 Cleared all job cache');
        return { cleared: -1 };
      }
    } catch (error) {
      console.error('Error clearing job cache:', error);
      throw error;
    }
  }

  /**
   * Health check for job cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await cacheService.healthCheck();
    } catch (error) {
      console.error('Job cache health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup job cache service
   */
  async cleanup(): Promise<void> {
    try {
      await cacheService.cleanup();
      console.log('🧹 JobCacheService cleaned up');
    } catch (error) {
      console.error('Error cleaning up job cache service:', error);
    }
  }
}

// Export singleton instance
export const jobCacheService = JobCacheService.getInstance();
