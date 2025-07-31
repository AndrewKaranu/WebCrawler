import { Request, Response } from 'express';
import { cacheService } from '../services/CacheService';
import { jobCacheService } from '../services/JobCacheService';
import { EngineFactory } from '../services/scraper/EngineFactory';
import { ApiResponse } from '../models/index';

export const cacheController = {
  /**
   * Get comprehensive cache statistics
   * GET /api/cache/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      // Get cache service stats
      const cacheInfo = await cacheService.getCacheInfo();
      
      // Get job cache stats
      const jobCacheStats = await jobCacheService.getJobCacheStats();
      
      // Get engine cache stats
      const engineStats = await EngineFactory.getAllCacheStats();
      
      const stats = {
        mainCache: {
          stats: cacheInfo.stats,
          hitRate: cacheInfo.hitRate,
          memoryUsage: cacheInfo.memoryUsage,
          totalRequests: cacheInfo.totalRequests,
          isInitialized: cacheInfo.isInitialized,
          cacheDir: cacheInfo.cacheDir
        },
        jobCache: {
          stats: jobCacheStats.stats,
          hitRate: jobCacheStats.hitRate,
          memoryUsage: jobCacheStats.memoryUsage,
          totalRequests: jobCacheStats.totalRequests,
          jobSpecificKeys: jobCacheStats.jobSpecificKeys
        },
        engines: engineStats,
        summary: {
          totalKeys: cacheInfo.stats.keys,
          totalHits: cacheInfo.stats.hits,
          totalMisses: cacheInfo.stats.misses,
          overallHitRate: cacheInfo.hitRate,
          combinedMemoryUsage: cacheInfo.memoryUsage,
          timestamp: new Date()
        }
      };

      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      } as ApiResponse);
    }
  },

  /**
   * Clear cache by pattern
   * DELETE /api/cache/clear?pattern=<pattern>
   */
  async clearByPattern(req: Request, res: Response): Promise<void> {
    try {
      const { pattern } = req.query as { pattern?: string };
      
      if (!pattern) {
        res.status(400).json({
          success: false,
          error: 'Pattern parameter is required',
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      console.log(`🧹 Clearing cache by pattern: ${pattern}`);
      
      // Clear main cache
      const mainCacheCleared = await cacheService.clearCacheByPattern(pattern);
      
      // Clear job cache
      const jobCacheCleared = await jobCacheService.clearJobCache(pattern);
      
      // Clear engine caches
      const engineResults = await EngineFactory.clearAllCaches(pattern);

      res.json({
        success: true,
        data: {
          pattern,
          mainCacheCleared,
          jobCacheCleared: jobCacheCleared.cleared,
          engineResults,
          timestamp: new Date()
        },
        message: `Cache cleared for pattern: ${pattern}`,
        timestamp: new Date()
      } as ApiResponse);
    } catch (error) {
      console.error('Error clearing cache by pattern:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      } as ApiResponse);
    }
  },

  /**
   * Clear all cache
   * DELETE /api/cache/clear-all
   */
  async clearAll(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧹 Clearing all cache...');
      
      // Clear main cache
      await cacheService.clearAllCache();
      
      // Clear job cache
      await jobCacheService.clearJobCache();
      
      // Clear all engine caches
      const engineResults = await EngineFactory.clearAllCaches();

      res.json({
        success: true,
        data: {
          cleared: 'all',
          engineResults,
          timestamp: new Date()
        },
        message: 'All cache cleared successfully',
        timestamp: new Date()
      } as ApiResponse);
    } catch (error) {
      console.error('Error clearing all cache:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      } as ApiResponse);
    }
  },

  /**
   * Cache health check
   * GET /api/cache/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const mainCacheHealthy = await cacheService.healthCheck();
      const jobCacheHealthy = await jobCacheService.healthCheck();
      
      const overall = mainCacheHealthy && jobCacheHealthy;

      res.json({
        success: true,
        data: {
          healthy: overall,
          mainCache: mainCacheHealthy,
          jobCache: jobCacheHealthy,
          timestamp: new Date()
        },
        timestamp: new Date()
      } as ApiResponse);
    } catch (error) {
      console.error('Error in cache health check:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      } as ApiResponse);
    }
  },

  /**
   * Warm up cache with URLs
   * POST /api/cache/warmup
   */
  async warmupCache(req: Request, res: Response): Promise<void> {
    try {
      const { urls, engine = 'spider', options = {} } = req.body;
      
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({
          success: false,
          error: 'URLs array is required and cannot be empty',
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      console.log(`🔥 Warming up cache for ${urls.length} URLs with ${engine} engine`);
      
      const result = await EngineFactory.warmupEngine(engine, urls, options);

      res.json({
        success: true,
        data: {
          ...result,
          engine,
          totalUrls: urls.length,
          timestamp: new Date()
        },
        message: `Cache warmup completed for ${engine} engine`,
        timestamp: new Date()
      } as ApiResponse);
    } catch (error) {
      console.error('Error warming up cache:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      } as ApiResponse);
    }
  }
};
