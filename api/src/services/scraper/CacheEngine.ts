import { ScrapeOptions, EngineResult } from '../../models/index';
import { cacheService } from '../CacheService';
import { IEngine, EngineCapabilities, EngineConfig } from './IEngine';

/**
 * CacheEngine: Dedicated caching layer that intercepts all operations
 * before they reach the actual scraping engines (Spider, Playwright, etc.)
 * 
 * This engine provides lightning-fast response times by checking cache first
 * and only delegating to the underlying engine if cache miss occurs.
 */
export class CacheEngine implements IEngine {
  readonly name: string = 'Cache Engine';
  readonly version: string = '1.0.0';
  readonly capabilities: EngineCapabilities;
  
  private underlyingEngine: IEngine;

  constructor(underlyingEngine: IEngine) {
    this.underlyingEngine = underlyingEngine;
    
    // Inherit capabilities from underlying engine but add cache capability
    this.capabilities = {
      ...underlyingEngine.capabilities,
      stealth: true // Cache provides stealth by avoiding repeated requests
    };
  }

  /**
   * Scrape with cache-first strategy
   */
  async scrape(options: ScrapeOptions): Promise<EngineResult> {
    console.log(`🔍 Cache Engine: Processing ${options.url}`);
    
    // Check if cache bypass is requested
    if (options.bypassCache) {
      console.log(`🚫 Cache bypass requested for: ${options.url}`);
    } else {
      // Check cache first
      const cachedResult = await cacheService.getCachedScrapeResult(options);
      if (cachedResult) {
        console.log(`🚀 Cache HIT for: ${options.url}`);
        return cachedResult;
      }
    }

    console.log(`💨 Cache MISS for: ${options.url} - delegating to ${this.underlyingEngine.name}`);
    
    // Cache miss - delegate to underlying engine
    const result = await this.underlyingEngine.scrape(options);
    
    // Cache the result for future use
    await cacheService.cacheScrapeResult(options, result);
    console.log(`💾 Cached result for: ${options.url}`);
    
    return result;
  }

  /**
   * Scrape multiple URLs with cache-first strategy for each
   */
  async scrapeMultiple(urls: string[], options: ScrapeOptions): Promise<EngineResult[]> {
    console.log(`🔍 Cache Engine: Processing ${urls.length} URLs with cache-first strategy`);
    
    const results: EngineResult[] = [];
    const cacheMisses: string[] = [];
    const cacheHits: { url: string; result: EngineResult }[] = [];
    
    // Determine if cache bypass is requested
    const bypassCache = options.bypassCache === true;
    if (bypassCache) {
      console.log(`🚫 Cache bypass requested for batch processing`);
      // If bypassing cache, treat all URLs as cache misses
      cacheMisses.push(...urls);
    } else {
      // First pass: Check cache for all URLs
      for (const url of urls) {
        const urlOptions = { ...options, url };
        const cachedResult = await cacheService.getCachedScrapeResult(urlOptions);
      
        if (cachedResult) {
          console.log(`🚀 Cache HIT for: ${url}`);
          cacheHits.push({ url, result: cachedResult });
        } else {
          console.log(`💨 Cache MISS for: ${url}`);
          cacheMisses.push(url);
        }
      }
    }
    
    // Second pass: Process cache misses with underlying engine
    let missResults: EngineResult[] = [];
    if (cacheMisses.length > 0) {
      console.log(`🚀 Processing ${cacheMisses.length} cache misses with ${this.underlyingEngine.name}`);
      missResults = await this.underlyingEngine.scrapeMultiple(cacheMisses, options);
      
      // Cache all the new results
      for (let i = 0; i < cacheMisses.length; i++) {
        const url = cacheMisses[i];
        const result = missResults[i];
        if (result) {
          const urlOptions = { ...options, url };
          await cacheService.cacheScrapeResult(urlOptions, result);
          console.log(`💾 Cached result for: ${url}`);
        }
      }
    }
    
    // Merge results in original order
    for (const url of urls) {
      const cacheHit = cacheHits.find(hit => hit.url === url);
      if (cacheHit) {
        results.push(cacheHit.result);
      } else {
        const missIndex = cacheMisses.indexOf(url);
        if (missIndex >= 0 && missResults[missIndex]) {
          results.push(missResults[missIndex]);
        } else {
          // Fallback error result
          results.push({
            url,
            html: '',
            text: '',
            title: '',
            meta: {},
            links: [],
            images: [],
            loadTime: 0,
            statusCode: 0,
            headers: {},
            timestamp: new Date(),
          });
        }
      }
    }
    
    console.log(`✅ Cache Engine completed: ${cacheHits.length} cache hits, ${missResults.length} cache misses`);
    return results;
  }

  /**
   * Initialize both cache and underlying engine
   */
  async initialize(config?: EngineConfig): Promise<void> {
    console.log('🚀 Initializing Cache Engine...');
    
    // Initialize cache service
    await cacheService.initialize();
    
    // Initialize underlying engine
    await this.underlyingEngine.initialize(config);
    
    console.log('✅ Cache Engine initialized');
  }

  /**
   * Check health of both cache and underlying engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      const cacheHealthy = await cacheService.healthCheck();
      const engineHealthy = await this.underlyingEngine.healthCheck();
      
      return cacheHealthy && engineHealthy;
    } catch (error) {
      console.error('Cache Engine health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup both cache and underlying engine
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Cache Engine...');
    await cacheService.cleanup();
    await this.underlyingEngine.cleanup();
    console.log('✅ Cache Engine cleaned up');
  }

  /**
   * Get cache statistics and performance metrics
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
    underlyingEngine: string;
  }> {
    const cacheInfo = await cacheService.getCacheInfo();
    
    return {
      hits: cacheInfo.stats.hits,
      misses: cacheInfo.stats.misses,
      hitRate: cacheInfo.hitRate,
      totalKeys: cacheInfo.stats.keys,
      memoryUsage: cacheInfo.memoryUsage,
      underlyingEngine: this.underlyingEngine.name
    };
  }

  /**
   * Clear cache by pattern or completely
   */
  async clearCache(pattern?: string): Promise<{ cleared: number }> {
    if (pattern) {
      const cleared = await cacheService.clearCacheByPattern(pattern);
      return { cleared };
    } else {
      await cacheService.clearAllCache();
      return { cleared: -1 }; // Indicate all cleared
    }
  }

  /**
   * Warm up cache with predefined URLs
   */
  async warmupCache(urls: string[], options: ScrapeOptions): Promise<{
    warmedUp: number;
    skipped: number;
    failed: number;
  }> {
    console.log(`🔥 Warming up cache for ${urls.length} URLs...`);
    
    let warmedUp = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const url of urls) {
      try {
        const urlOptions = { ...options, url };
        
        // Check if already cached
        const cached = await cacheService.getCachedScrapeResult(urlOptions);
        if (cached) {
          console.log(`⏭️ Already cached: ${url}`);
          skipped++;
          continue;
        }
        
        // Scrape and cache
        console.log(`🔥 Warming up: ${url}`);
        await this.scrape(urlOptions);
        warmedUp++;
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to warm up ${url}:`, error);
        failed++;
      }
    }
    
    console.log(`🔥 Cache warmup completed: ${warmedUp} warmed up, ${skipped} skipped, ${failed} failed`);
    
    return { warmedUp, skipped, failed };
  }
}
