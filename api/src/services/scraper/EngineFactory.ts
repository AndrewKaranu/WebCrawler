import { IEngine, EngineCapabilities, EngineConfig } from './IEngine';
import { ScrapeOptions, EngineResult } from '../../models/index';
import { SpiderEngine } from './SpiderEngine';

/**
 * Factory for creating and managing scraping engines
 */
export class EngineFactory {
  private static engines = new Map<string, IEngine>();
  private static spiderEngineInstance: SpiderEngine | null = null;

  /**
   * Get an engine instance by name - uses singleton for SpiderEngine
   */
  static async getEngine(engineName: string, config?: EngineConfig): Promise<IEngine> {
    switch (engineName.toLowerCase()) {
      case 'spider':
      case 'playwright':
        // Use singleton SpiderEngine instance
        if (!this.spiderEngineInstance) {
          this.spiderEngineInstance = new SpiderEngine();
          await this.spiderEngineInstance.initialize(config);
        }
        return this.spiderEngineInstance;

      default:
        // For other engines, use the old caching mechanism
        const cacheKey = `${engineName}-${JSON.stringify(config || {})}`;
        
        if (this.engines.has(cacheKey)) {
          return this.engines.get(cacheKey)!;
        }

        const engine = await this.createEngine(engineName, config);
        this.engines.set(cacheKey, engine);
        
        return engine;
    }
  }

  /**
   * Get the singleton SpiderEngine instance
   */
  static getSpiderEngine(): SpiderEngine | null {
    return this.spiderEngineInstance;
  }

  /**
   * Clear the SpiderEngine singleton (useful for testing or restart)
   */
  static async clearSpiderEngine(): Promise<void> {
    if (this.spiderEngineInstance) {
      await this.spiderEngineInstance.cleanup();
      this.spiderEngineInstance = null;
    }
  }

  /**
   * Create a new engine instance
   */
  private static async createEngine(engineName: string, config?: EngineConfig): Promise<IEngine> {
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

      case 'cache':
        return this.createMockEngine('cache');

      default:
        // Default to SpiderEngine
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
        // Mock initialization
      },
      async scrape(options: ScrapeOptions): Promise<EngineResult> {
        // Mock scraping result
        return {
          url: options.url,
          html: '<html><body><h1>Mock Result</h1></body></html>',
          text: 'Mock Result',
          title: 'Mock Page',
          meta: {},
          links: [],
          images: [],
          loadTime: 1000,
          statusCode: 200,
          headers: {},
          timestamp: new Date(),
        };
      },
      async scrapeMultiple(urls: string[], options: ScrapeOptions): Promise<EngineResult[]> {
        // Mock batch scraping
        return urls.map(url => ({
          url,
          html: '<html><body><h1>Mock Result</h1></body></html>',
          text: 'Mock Result',
          title: 'Mock Page',
          meta: {},
          links: [],
          images: [],
          loadTime: 1000,
          statusCode: 200,
          headers: {},
          timestamp: new Date(),
        }));
      },
      async healthCheck(): Promise<boolean> {
        return true;
      },
      async cleanup(): Promise<void> {
        // Mock cleanup
      },
    };
  }

  /**
   * Get available engines and their capabilities
   */
  static getAvailableEngines(): Record<string, EngineCapabilities> {
    return {
      playwright: {
        javascript: true,
        cookies: true,
        screenshots: true,
        userInteraction: true,
        headless: true,
        proxy: true,
        stealth: true,
      },
      selenium: {
        javascript: true,
        cookies: true,
        screenshots: true,
        userInteraction: true,
        headless: true,
        proxy: true,
        stealth: false,
      },
      http: {
        javascript: false,
        cookies: true,
        screenshots: false,
        userInteraction: false,
        headless: true,
        proxy: true,
        stealth: false,
      },
      cache: {
        javascript: false,
        cookies: false,
        screenshots: false,
        userInteraction: false,
        headless: true,
        proxy: false,
        stealth: false,
      },
    };
  }

  /**
   * Cleanup all engine instances
   */
  static async cleanup(): Promise<void> {
    // Cleanup singleton SpiderEngine
    await this.clearSpiderEngine();
    
    // Cleanup other engines
    const cleanupPromises = Array.from(this.engines.values()).map(engine => 
      engine.cleanup().catch(console.error)
    );
    
    await Promise.all(cleanupPromises);
    this.engines.clear();
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
    return scores[0]?.name || 'playwright'; // Default to playwright
  }
}
