import { ScrapeOptions, EngineResult } from '../../models/index';

/**
 * Base interface for all scraping engines
 */
export interface IEngine {
  readonly name: string;
  readonly version: string;
  readonly capabilities: EngineCapabilities;
  
  /**
   * Initialize the engine with configuration
   */
  initialize(config?: EngineConfig): Promise<void>;
  
  /**
   * Scrape a single URL
   */
  scrape(options: ScrapeOptions): Promise<EngineResult>;
  
  /**
   * Scrape multiple URLs concurrently
   */
  scrapeMultiple(urls: string[], options: ScrapeOptions): Promise<EngineResult[]>;
  
  /**
   * Check if engine is healthy and ready
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

export interface EngineCapabilities {
  javascript: boolean;
  cookies: boolean;
  screenshots: boolean;
  userInteraction: boolean;
  headless: boolean;
  proxy: boolean;
  stealth: boolean;
}

export interface EngineConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  retries?: number;
  cache?: boolean;
}

export interface CDPTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

// Generic CDP response
export interface CDPResponse {
  id: string;
  [key: string]: any;
}
