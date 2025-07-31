import express from 'express';
import { scrapeController } from './controllers/scrape';
import { mapController } from './controllers/map';
import { searchController } from './controllers/search';
import { transformController } from './controllers/transform';
import { jobsController } from './controllers/jobs';
import { cacheController } from './controllers/cache';
import { DiveController } from './controllers/dive';
import { massScraperController } from './controllers/massScraperController';
import { massScraperService } from './services/MassScraperService';
import { ContentController } from './controllers/content';
import { corpusController } from './controllers/corpus';

const router = express.Router();

// Initialize controllers
const diveController = new DiveController();
const contentController = new ContentController();

// Scraping endpoints
router.post('/scrape', scrapeController.scrape);
router.post('/scrape/batch', scrapeController.batchScrape);

// Site mapping endpoints
router.post('/map', mapController.mapSite);
router.get('/map/:jobId/status', mapController.getMapStatus);

// Search endpoints
router.post('/search', searchController.search);
router.post('/search/extract', searchController.extractFromResults);

// Data transformation endpoints
router.post('/transform/html-to-markdown', transformController.htmlToMarkdown);
router.post('/transform/extract-data', transformController.extractData);

// Job management endpoints
router.get('/jobs', jobsController.listJobs);
router.get('/jobs/:jobId', jobsController.getJob);
router.delete('/jobs/:jobId', jobsController.deleteJob);

// Cache management endpoints
router.get('/cache/stats', cacheController.getStats);
router.get('/cache/health', cacheController.healthCheck);
router.delete('/cache/clear', cacheController.clearByPattern);
router.delete('/cache/clear-all', cacheController.clearAll);
router.post('/cache/warmup', cacheController.warmupCache);

// Content management endpoints
router.get('/content', contentController.getAllContent);
router.get('/content/:id', contentController.getContentById);
router.delete('/content/:id', contentController.deleteContent);
router.post('/content/export', contentController.exportContent);
router.get('/content/domains', contentController.getDomains);

// Corpus management endpoints
router.post('/corpus', corpusController.createCorpus);
router.get('/corpus', corpusController.getAllCorpuses);
router.get('/corpus/:corpusId', corpusController.getCorpusById);
router.post('/corpus/:corpusId/content', corpusController.addContentFromMassScrape);
router.get('/corpus/:corpusId/statistics', corpusController.getCorpusStatistics);
router.post('/corpus/:corpusId/export', corpusController.exportCorpus);
router.delete('/corpus/:corpusId', corpusController.deleteCorpus);

// Create corpus from batch
router.post('/corpus/from-batch/:batchId', massScraperController.createCorpusFromBatch);

// Mass scraper endpoints
router.post('/mass-scrape', massScraperController.createBatch);
router.get('/mass-scrape', massScraperController.getAllBatches);
router.get('/mass-scrape/:batchId', massScraperController.getBatchStatus);
router.get('/mass-scrape/:batchId/results', massScraperController.getBatchResults);
router.delete('/mass-scrape/:batchId/cancel', massScraperController.cancelBatch);
router.delete('/mass-scrape/:batchId', massScraperController.deleteBatch);
router.post('/mass-scrape/from-dive', massScraperController.createBatchFromDive);

// Engine management endpoints
router.get('/engines', (req: express.Request, res: express.Response) => {
  res.json({
    engines: ['spider', 'playwright', 'selenium', 'http', 'cache'],
    default: 'spider'
  });
});

// Test endpoint for SpiderEngine
router.post('/test/spider', async (req: express.Request, res: express.Response) => {
  try {
    const { url = 'https://example.com', engine: engineType = 'spider', options = {} } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    console.log(`Testing ${engineType} engine with URL: ${url}${options.bypassCache ? ' (bypass cache)' : ''}`);
    
    const engine = await EngineFactory.getEngine(engineType);
    const result = await engine.scrape({
      url,
      engine: engineType,
      timeout: options.timeout || 15000,
      waitFor: options.waitForLoad,
      bypassCache: options.bypassCache || false,
      screenshot: false,
      fullPage: false,
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Spider test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Browser automation configuration endpoints
router.post('/automate/set-headless', async (req: express.Request, res: express.Response) => {
  try {
    const { headless = true } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    // Get the singleton SpiderEngine
    const engine = await EngineFactory.getEngine('spider');
    
    if ('setHeadlessMode' in engine) {
      await (engine as any).setHeadlessMode(headless);
    }
    
    res.json({
      success: true,
      message: `Headless mode set to: ${headless}. ${headless ? 'Browser is now hidden.' : 'Browser window will be visible for automation.'}`,
      headless,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to set headless mode:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.get('/automate/headless-status', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    // Get the singleton SpiderEngine
    const engine = await EngineFactory.getEngine('spider');
    let headless = true;
    if ('isHeadless' in engine) {
      headless = (engine as any).isHeadless();
    }
    
    res.json({
      success: true,
      headless,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to get headless status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Browser management endpoint
router.post('/automate/restart-browser', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    // Clear the singleton and restart
    await EngineFactory.clearAllEngines();
    
    // Get a new instance (will initialize fresh)
    const engine = await EngineFactory.getEngine('spider');
    
    res.json({
      success: true,
      message: 'Browser restarted successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to restart browser:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Browser automation endpoints
router.post('/automate/navigate', async (req: express.Request, res: express.Response) => {
  try {
    const { url, waitUntil = 'load' } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    await engine.navigateTo(url, waitUntil);
    
    return res.json({
      success: true,
      message: `Navigated to ${url}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Navigation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/click', async (req: express.Request, res: express.Response) => {
  try {
    const { selector, waitForNavigation = false } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!selector) {
      return res.status(400).json({
        success: false,
        error: 'Selector is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    await engine.click(selector, { waitForNavigation });
    
    return res.json({
      success: true,
      message: `Clicked element: ${selector}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Click error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/type', async (req: express.Request, res: express.Response) => {
  try {
    const { selector, text, delay = 50, clear = true } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!selector || !text) {
      return res.status(400).json({
        success: false,
        error: 'Selector and text are required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    await engine.type(selector, text, { delay, clear });
    
    return res.json({
      success: true,
      message: `Typed text into element: ${selector}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Type error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/fill-form', async (req: express.Request, res: express.Response) => {
  try {
    const { formData, submitSelector } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Form data object is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    await engine.fillForm(formData, submitSelector);
    
    return res.json({
      success: true,
      message: 'Form filled successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Fill form error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Auto-detect form fields
router.get('/automate/auto-detect-fields', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    const engine = await EngineFactory.getEngine('spider') as any;
    
    const detectedFields = await engine.autoDetectFormFields();
    
    res.json({
      success: true,
      data: detectedFields,
      message: 'Form fields auto-detected successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Auto-detect fields error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Smart form filling with auto-detection fallback
router.post('/automate/smart-fill-form', async (req: express.Request, res: express.Response) => {
  try {
    const { formData, submitSelector } = req.body;
    
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Form data object is required',
        timestamp: new Date()
      });
    }
    
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    const engine = await EngineFactory.getEngine('spider') as any;
    
    await engine.smartFillForm(formData, submitSelector);
    
    return res.json({
      success: true,
      message: 'Smart form filled successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Smart fill form error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Get all form elements on the page for debugging
router.get('/automate/form-elements', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    const engine = await EngineFactory.getEngine('spider') as any;
    
    const elements = await engine.getFormElements();
    
    res.json({
      success: true,
      elements,
      count: elements.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get form elements error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Get page HTML for debugging
router.get('/automate/page-html', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    const engine = await EngineFactory.getEngine('spider') as any;
    
    const html = await engine.getPageHTML();
    
    res.json({
      success: true,
      html: html.substring(0, 50000), // Truncate to avoid huge responses
      fullLength: html.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get page HTML error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/wait-for-element', async (req: express.Request, res: express.Response) => {
  try {
    const { selector, timeout = 10000 } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!selector) {
      return res.status(400).json({
        success: false,
        error: 'Selector is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    await engine.waitForElement(selector, timeout);
    
    return res.json({
      success: true,
      message: `Element ${selector} is now visible`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Wait for element error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/get-text', async (req: express.Request, res: express.Response) => {
  try {
    const { selector } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!selector) {
      return res.status(400).json({
        success: false,
        error: 'Selector is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    const text = await engine.getText(selector);
    
    return res.json({
      success: true,
      data: { text },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get text error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/screenshot-element', async (req: express.Request, res: express.Response) => {
  try {
    const { selector } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!selector) {
      return res.status(400).json({
        success: false,
        error: 'Selector is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    const screenshot = await engine.screenshotElement(selector);
    
    return res.json({
      success: true,
      data: { screenshot },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Screenshot element error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Screenshot current viewport
router.post('/automate/screenshot-viewport', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    const engine = await EngineFactory.getEngine('spider') as any;
    const screenshot = await engine.screenshotViewport();
    return res.json({
      success: true,
      data: screenshot,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Screenshot viewport error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Screenshot full page
router.post('/automate/screenshot-full-page', async (req: express.Request, res: express.Response) => {
  try {
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    const engine = await EngineFactory.getEngine('spider') as any;
    const screenshot = await engine.screenshotFullPage();
    return res.json({
      success: true,
      data: screenshot,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Screenshot full page error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

router.post('/automate/execute-script', async (req: express.Request, res: express.Response) => {
  try {
    const { script } = req.body;
    const { EngineFactory } = await import('./services/scraper/EngineFactory');
    
    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script is required',
        timestamp: new Date()
      });
    }
    
    const engine = await EngineFactory.getEngine('spider') as any;
    const result = await engine.evaluateScript(script);
    
    return res.json({
      success: true,
      data: { result },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Execute script error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Dive endpoints (website structure mapping)
router.post('/dive', diveController.performDive.bind(diveController));
router.post('/dive/preview', diveController.generatePreview.bind(diveController));
router.get('/dive/progress/:jobId', diveController.getDiveProgress.bind(diveController));
router.post('/dive/validate', diveController.validateDiveRequest.bind(diveController));
router.get('/dive/config', diveController.getDiveConfig.bind(diveController));
router.post('/dive/analyze', diveController.analyzeSitemap.bind(diveController));
router.get('/dive/sitemaps', diveController.getAllSitemaps.bind(diveController));
router.get('/dive/sitemaps/:id', diveController.getSitemapById.bind(diveController));

// Corpus management endpoints (Results Corpus)
router.post('/corpus', corpusController.createCorpus);
router.get('/corpus', corpusController.getAllCorpuses);
router.get('/corpus/:corpusId', corpusController.getCorpusById);
router.post('/corpus/:corpusId/content/mass-scrape', corpusController.addContentFromMassScrape);
// Route to create corpus from an existing mass scrape batch
router.post('/corpus/from-batch/:batchId', massScraperController.createCorpusFromBatch);
router.post('/corpus/:corpusId/sitemap/dive', corpusController.addSitemapFromDive);
router.post('/corpus/:corpusId/export', corpusController.exportCorpus);
router.delete('/corpus/:corpusId', corpusController.deleteCorpus);
router.get('/corpus/:corpusId/statistics', corpusController.getCorpusStatistics);
router.post('/corpus/from-mass-scrape', corpusController.createCorpusFromMassScrape);
router.post('/corpus/from-dive', corpusController.createCorpusFromDive);

export { router as routes };
