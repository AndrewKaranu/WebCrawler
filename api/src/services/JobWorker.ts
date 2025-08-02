import { jobQueue } from './JobQueue';
import { v4 as uuidv4 } from 'uuid';
import { SpiderEngine } from './scraper/SpiderEngine/index';
import { EngineFactory } from './scraper/EngineFactory';
import { jobCacheService } from './JobCacheService';
import { DiveRequest } from './DiveService';

let engine: SpiderEngine | null = null;

// Initialize the spider engine
async function getSpiderEngine(): Promise<SpiderEngine> {
  if (!engine) {
    engine = new SpiderEngine();
    await engine.initialize();
  }
  return engine;
}

// Initialize job cache service
async function initializeJobCache(): Promise<void> {
  await jobCacheService.initialize();
  console.log('🚀 Job cache service initialized');
}

// Initialize on module load
initializeJobCache().catch(console.error);

// Register job processors with cache-first strategy
jobQueue.process('diveFull', async (job) => {
  console.log(`🔍 Processing dive job ${job.id} with cache check`);
  // Extract dive request parameters
  const { request } = job.data as { request: DiveRequest };
  // Check cache first for dive results
  const cachedDiveResult = await jobCacheService.checkDiveJobCache(request.url);
  if (cachedDiveResult) {
    console.log(`🚀 Cache HIT for dive job: ${request.url}`);
    await job.updateProgress({
      processed: cachedDiveResult.pages?.length || 0,
      queued: 0,
      visited: cachedDiveResult.pages?.length || 0,
      status: 'Dive completed from cache'
    });
    // Skip storing cached sitemaps to avoid duplicates
    return {
      success: true,
      url: request.url,
      pagesFound: cachedDiveResult.pages?.length || 0,
      sitemap: cachedDiveResult,
      fromCache: true
    };
  }
  console.log(`💨 Cache MISS for dive job: ${request.url} - performing fresh dive`);
  const spiderEngine = await getSpiderEngine();
  
  // Update initial progress
  await job.updateProgress({ 
    processed: 0, 
    queued: 1, 
    visited: 0,
    status: 'Starting fresh dive...'
  });
  
  try {
    // Convert DiveRequest to DiveOptions
    const diveOptions = {
      startUrl: request.url,
      maxDepth: request.maxDepth || 3,
      maxPages: request.maxPages || 50,
      followExternalLinks: request.followExternalLinks || false,
      includeAssets: request.includeAssets || false,
      respectRobotsTxt: request.respectRobotsTxt || true,
      stayWithinBaseUrl: request.stayWithinBaseUrl ?? true,
      delay: request.delay || 1000,
      userAgent: request.userAgent,
      excludePatterns: request.excludePatterns || [],
      includePatterns: request.includePatterns || [],
    };
    
    // Start the dive with progress tracking
    const divePromise = spiderEngine.dive(diveOptions);
    
    // Periodically update progress
    const progressInterval = setInterval(async () => {
      try {
        const progress = spiderEngine.getDiveProgress();
        const info = spiderEngine.getDiveInfo();
        
        await job.updateProgress({
          processed: progress.processed,
          queued: progress.queued,
          visited: progress.visited,
          domain: info.domain,
          baseUrl: info.baseUrl,
          status: 'Diving in progress...'
        });
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }, 2000);
    
    const result = await divePromise;
    clearInterval(progressInterval);
    
    // Cache the dive result for future use
    await jobCacheService.cacheDiveJobResult(request.url, result);
    console.log(`💾 Cached dive result for: ${request.url}`);
    
    // Create a sitemapId and store in DiveService
    try {
      const { DiveService } = require('./DiveService');
      const diveService = new DiveService();
      const sitemapId = uuidv4();
      await diveService.saveSitemap(sitemapId, result, request.url);
      console.log(`🗺️ Stored sitemap in DiveService with ID: ${sitemapId}`);
    } catch (error) {
      console.error('Error storing sitemap in DiveService:', error);
    }
    
    await job.updateProgress({ 
      processed: result.pages.length, 
      queued: 0, 
      visited: result.pages.length,
      status: 'Dive completed successfully'
    });
    
    console.log(`✅ Dive completed for ${request.url}. Found ${result.pages.length} pages.`);
    
    return {
      success: true,
      url: request.url,
      pagesFound: result.pages.length,
      sitemap: result,
      fromCache: false
    };
    
  } catch (error) {
    console.error(`❌ Dive failed for ${request.url}:`, error);
    await job.updateProgress({ 
      status: `Dive failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    throw error;
  }
});

jobQueue.process('divePreview', async (job) => {
  console.log(`Processing preview job ${job.id}`);
  
  const { url, options } = job.data;
  const spiderEngine = await getSpiderEngine();
  
  await job.updateProgress({ 
    status: 'Starting preview...',
    processed: 0
  });
  
  try {
    // For preview, limit to depth 1 and fewer pages
    const previewOptions = {
      startUrl: url,
      maxDepth: 1,
      maxPages: Math.min(options?.maxPages || 10, 10),
      followExternalLinks: options?.followExternalLinks || false,
      includeAssets: options?.includeAssets || false,
      respectRobotsTxt: options?.respectRobotsTxt || true,
      stayWithinBaseUrl: options?.stayWithinBaseUrl ?? true,
      delay: options?.delay || 1000,
      userAgent: options?.userAgent,
      excludePatterns: options?.excludePatterns || [],
      includePatterns: options?.includePatterns || [],
    };
    
    const result = await spiderEngine.dive(previewOptions);
    
    await job.updateProgress({ 
      processed: result.pages.length,
      status: 'Preview completed'
    });
    
    return {
      success: true,
      url,
      linkCount: result.pages.length,
      preview: result
    };
    
  } catch (error) {
    console.error(`Preview failed for ${url}:`, error);
    await job.updateProgress({ 
      status: `Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    throw error;
  }
});

jobQueue.process('scrapePage', async (job) => {
  console.log(`🔍 Processing scrape job ${job.id} with cache check`);
  
  const { url, options } = job.data;
  
  // Check cache first for scrape results
  const cachedResult = await jobCacheService.checkScrapeJobCache({ url, options });
  if (cachedResult) {
    console.log(`🚀 Cache HIT for scrape job: ${url}`);
    
    await job.updateProgress({ 
      processed: 1,
      status: 'Scrape completed from cache'
    });
    
    return {
      success: true,
      url,
      result: cachedResult,
      fromCache: true
    };
  }
  
  console.log(`💨 Cache MISS for scrape job: ${url} - performing fresh scrape`);
  
  // Use the caching engine instead of direct spider engine
  const cacheEngine = await EngineFactory.getEngine('spider');
  
  await job.updateProgress({ 
    status: 'Scraping page...',
    processed: 0
  });
  
  try {
    const result = await cacheEngine.scrape({
      url,
      ...options
    });
    
    await job.updateProgress({ 
      processed: 1,
      status: 'Scrape completed'
    });
    
    console.log(`✅ Scrape completed for ${url}`);
    
    return {
      success: true,
      url,
      result,
      fromCache: false
    };
    
  } catch (error) {
    console.error(`❌ Scrape failed for ${url}:`, error);
    await job.updateProgress({ 
      status: `Scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    throw error;
  }
});

console.log('🚀 Cache-enabled job queue workers registered and ready...');
