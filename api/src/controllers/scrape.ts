import { Request, Response } from 'express';
import { ScrapeOptionsSchema, BatchScrapeRequest, ApiResponse, EngineResult } from '../models/index';
import { EngineFactory } from '../services/scraper/EngineFactory';

export const scrapeController = {
  /**
   * Scrape a single URL with cache-first strategy
   */
  async scrape(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validation = ScrapeOptionsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid scrape options',
          details: validation.error.issues,
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const options = validation.data;
      
      console.log(`🔍 Scrape request for ${options.url} with ${options.engine} engine (cache-enabled)`);
      
      // Get cache-enabled engine (all engines are now wrapped with caching)
      const cacheEngine = await EngineFactory.getEngine(options.engine);
      
      // Perform scraping with cache-first strategy
      const result = await cacheEngine.scrape(options);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      } as ApiResponse<EngineResult>);
      
    } catch (error) {
      console.error('Scrape error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      } as ApiResponse);
    }
  },

  /**
   * Scrape multiple URLs in batch with cache-first strategy
   */
  async batchScrape(req: Request, res: Response): Promise<void> {
    try {
      const { urls, options } = req.body as BatchScrapeRequest;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({
          success: false,
          error: 'URLs array is required and cannot be empty',
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      // Validate scrape options
      const validation = ScrapeOptionsSchema.safeParse(options);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid scrape options',
          details: validation.error.issues,
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const validatedOptions = validation.data;
      
      console.log(`🔍 Batch scrape request for ${urls.length} URLs with ${validatedOptions.engine} engine (cache-enabled)`);
      
      // Get cache-enabled engine (all engines are now wrapped with caching)
      const cacheEngine = await EngineFactory.getEngine(validatedOptions.engine);
      
      // Perform batch scraping with cache-first strategy for each URL
      const results = await cacheEngine.scrapeMultiple(urls, validatedOptions);
      
      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: urls.length,
            successful: results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length,
            failed: results.filter(r => r.statusCode >= 400).length
          }
        },
        timestamp: new Date()
      } as ApiResponse);
      
    } catch (error) {
      console.error('Batch scrape error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      } as ApiResponse);
    }
  }
};
