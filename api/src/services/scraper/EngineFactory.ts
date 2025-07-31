import { IEngine, EngineCapabilities, EngineConfig } from './IEngine';
import { ScrapeOptions, EngineResult } from '../../models/index';
import { SpiderEngine } from './SpiderEngine';
import { CacheEngine } from './CacheEngine';

/**
 * Factory for creating and managing scraping engines with dedicated caching layer
 */
export class EngineFactory {
  private static engines = new Map<string, IEngine>();
  private static spiderEngineInstance: SpiderEngine | null = null;
  private static cacheEngineInstance: CacheEngine | null = null;

  /**
   * Get an engine instance by name with caching layer
   * All engines are wrapped by CacheEngine for lightning-fast performance
   */
  static async getEngine(engineName: string, config?: EngineConfig): Promise<IEngine> {
    // Always return the cached version of any engine
    const cacheKey = `cached-${engineName}-${JSON.stringify(config || {})}`;
    
    if (this.engines.has(cacheKey)) {
      return this.engines.get(cacheKey)!;
    }

    // Create the underlying engine first
    const underlyingEngine = await this.createUnderlyingEngine(engineName, config);
    
    // Wrap it with CacheEngine for lightning-fast caching
    const cachedEngine = new CacheEngine(underlyingEngine);
    await cachedEngine.initialize(config);
    
    // Cache the engine instance
    this.engines.set(cacheKey, cachedEngine);
    
    console.log(`🚀 Created cached ${engineName} engine`);
    return cachedEngine;
  }

  /**
   * Get the raw underlying engine without caching (for internal use)
   */
  static async getUnderlyingEngine(engineName: string, config?: EngineConfig): Promise<IEngine> {
    return await this.createUnderlyingEngine(engineName, config);
  }

  /**
   * Get the singleton SpiderEngine instance (cached)
   */
  static async getCachedSpiderEngine(): Promise<CacheEngine> {
    if (!this.cacheEngineInstance) {
      // Create underlying SpiderEngine
      if (!this.spiderEngineInstance) {
        this.spiderEngineInstance = new SpiderEngine();
        await this.spiderEngineInstance.initialize();
      }
      
      // Wrap with CacheEngine
      this.cacheEngineInstance = new CacheEngine(this.spiderEngineInstance);
      await this.cacheEngineInstance.initialize();
    }
    
    return this.cacheEngineInstance;
  }

  /**
   * Clear all engine instances
   */
  static async clearAllEngines(): Promise<void> {
    if (this.cacheEngineInstance) {
      await this.cacheEngineInstance.cleanup();
      this.cacheEngineInstance = null;
    }
    
    if (this.spiderEngineInstance) {
      await this.spiderEngineInstance.cleanup();
      this.spiderEngineInstance = null;
    }
    
    // Cleanup all other engines
    const cleanupPromises = Array.from(this.engines.values()).map(engine => 
      engine.cleanup().catch(console.error)
    );
    
    await Promise.all(cleanupPromises);
    this.engines.clear();
    
    console.log('🧹 All engines cleared');
  }

  /**
   * Create the underlying engine without caching wrapper
   */
  private static async createUnderlyingEngine(engineName: string, config?: EngineConfig): Promise<IEngine> {
    switch (engineName.toLowerCase()) {
      case 'spider':
      case 'playwright':
        // Use SpiderEngine for both spider and playwright requests
        const spiderEngine = new SpiderEngine();
        await spiderEngine.initialize(config);
        return spiderEngine;

      case 'selenium':
        return this.createMockEngine('selenium');

      case 'http':
        return this.createMockEngine('http');

      default:
        // Default to SpiderEngine for unknown engines
        const defaultEngine = new SpiderEngine();
        await defaultEngine.initialize(config);
        return defaultEngine;
    }
  }

  /**
   * Create a mock engine for testing (temporary)
   */
  private static createMockEngine(name: string): IEngine {
    return {
      name,
      version: '1.0.0',
      capabilities: {
        javascript: name === 'playwright' || name === 'selenium',
        cookies: true,
        screenshots: name === 'playwright' || name === 'selenium',
        userInteraction: name === 'playwright' || name === 'selenium',
        headless: true,
        proxy: true,
        stealth: name === 'playwright',
      },
      async initialize() {
        console.log(`🚀 Mock ${name} engine initialized`);
      },
      async scrape(options: ScrapeOptions): Promise<EngineResult> {
        // Simulate realistic delay for mock
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        return {
          url: options.url,
          html: `<html><body><h1>Mock ${name} Result</h1><p>This is a mock result from ${name} engine for ${options.url}</p></body></html>`,
          text: `Mock ${name} Result\nThis is a mock result from ${name} engine for ${options.url}`,
          title: `Mock ${name} Page - ${options.url}`,
          meta: { 
            'generator': `${name}-engine`,
            'mock': 'true'
          },
          links: [
            { href: `${options.url}/link1`, text: 'Mock Link 1' },
            { href: `${options.url}/link2`, text: 'Mock Link 2' }
          ],
          images: [
            { src: `${options.url}/image1.jpg`, alt: 'Mock Image 1' }
          ],
          loadTime: 500 + Math.random() * 1000,
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          timestamp: new Date(),
        };
      },
      async scrapeMultiple(urls: string[], options: ScrapeOptions): Promise<EngineResult[]> {
        // Mock batch scraping with realistic delays
        const results: EngineResult[] = [];
        
        for (const url of urls) {
          const result = await this.scrape({ ...options, url });
          results.push(result);
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
      },
      async healthCheck(): Promise<boolean> {
        return true;
      },
      async cleanup(): Promise<void> {
        console.log(`🧹 Mock ${name} engine cleaned up`);
      },
    };
  }

  /**
   * Get available engines and their capabilities
   */
  static getAvailableEngines(): Record<string, EngineCapabilities & { cached: boolean }> {
    return {
      spider: {
        javascript: true,
        cookies: true,
        screenshots: true,
        userInteraction: true,
        headless: true,
        proxy: true,
        stealth: true,
        cached: true, // All engines now have caching
      },
      playwright: {
        javascript: true,
        cookies: true,
        screenshots: true,
        userInteraction: true,
        headless: true,
        proxy: true,
        stealth: true,
        cached: true,
      },
      selenium: {
        javascript: true,
        cookies: true,
        screenshots: true,
        userInteraction: true,
        headless: true,
        proxy: true,
        stealth: false,
        cached: true,
      },
      http: {
        javascript: false,
        cookies: true,
        screenshots: false,
        userInteraction: false,
        headless: true,
        proxy: true,
        stealth: false,
        cached: true,
      },
    };
  }

  /**
   * Cleanup all engine instances
   */
  static async cleanup(): Promise<void> {
    await this.clearAllEngines();
  }

  /**
   * Get cache statistics from all engines
   */
  static async getAllCacheStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [key, engine] of this.engines.entries()) {
      if (engine instanceof CacheEngine) {
        try {
          stats[key] = await engine.getCacheStats();
        } catch (error) {
          stats[key] = { error: 'Failed to get stats' };
        }
      }
    }
    
    return stats;
  }

  /**
   * Clear cache for all engines
   */
  static async clearAllCaches(pattern?: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const [key, engine] of this.engines.entries()) {
      if (engine instanceof CacheEngine) {
        try {
          results[key] = await engine.clearCache(pattern);
        } catch (error) {
          results[key] = { error: 'Failed to clear cache' };
        }
      }
    }
    
    return results;
  }

  /**
   * Warm up cache for specific engine
   */
  static async warmupEngine(engineName: string, urls: string[], options: ScrapeOptions): Promise<any> {
    const engine = await this.getEngine(engineName);
    
    if (engine instanceof CacheEngine) {
      return await engine.warmupCache(urls, options);
    }
    
    throw new Error(`Engine ${engineName} does not support cache warmup`);
  }

  /**
   * Get the best engine for given requirements
   */
  static getBestEngine(requirements: Partial<EngineCapabilities>): string {
    const available = this.getAvailableEngines();
    
    // Score engines based on how well they match requirements
    const scores = Object.entries(available).map(([name, capabilities]) => {
      let score = 0;
      Object.entries(requirements).forEach(([capability, required]) => {
        if (required && capabilities[capability as keyof EngineCapabilities]) {
          score += 1;
        } else if (required && !capabilities[capability as keyof EngineCapabilities]) {
          score -= 10; // Heavy penalty for missing required capability
        }
      });
      return { name, score };
    });

    // Sort by score and return the best match
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.name || 'spider'; // Default to spider (was playwright)
  }
}
