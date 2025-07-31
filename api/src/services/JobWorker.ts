import { jobQueue } from './JobQueue';
import { SpiderEngine } from './scraper/SpiderEngine/index';
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

// Register job processors
jobQueue.process('diveFull', async (job) => {
  console.log(`Processing dive job ${job.id}`);
  
  const { request } = job.data as { request: DiveRequest };
  const spiderEngine = await getSpiderEngine();
  
  // Update initial progress
  await job.updateProgress({ 
    processed: 0, 
    queued: 1, 
    visited: 0,
    status: 'Starting dive...'
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
    
    await job.updateProgress({ 
      processed: result.pages.length, 
      queued: 0, 
      visited: result.pages.length,
      status: 'Dive completed successfully'
    });
    
    console.log(`Dive completed for ${request.url}. Found ${result.pages.length} pages.`);
    
    return {
      success: true,
      url: request.url,
      pagesFound: result.pages.length,
      sitemap: result
    };
    
  } catch (error) {
    console.error(`Dive failed for ${request.url}:`, error);
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
  console.log(`Processing scrape job ${job.id}`);
  
  const { url, options } = job.data;
  const spiderEngine = await getSpiderEngine();
  
  await job.updateProgress({ 
    status: 'Scraping page...',
    processed: 0
  });
  
  try {
    const result = await spiderEngine.scrape({
      url,
      ...options
    });
    
    await job.updateProgress({ 
      processed: 1,
      status: 'Scrape completed'
    });
    
    return {
      success: true,
      url,
      result
    };
    
  } catch (error) {
    console.error(`Scrape failed for ${url}:`, error);
    await job.updateProgress({ 
      status: `Scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    throw error;
  }
});

console.log('Simple job queue workers registered and ready...');
