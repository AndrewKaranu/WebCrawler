import express from 'express';
import { scrapeController } from './controllers/scrape';
import { crawlController } from './controllers/crawl';
import { mapController } from './controllers/map';
import { searchController } from './controllers/search';
import { transformController } from './controllers/transform';
import { jobsController } from './controllers/jobs';

const router = express.Router();

// Scraping endpoints
router.post('/scrape', scrapeController.scrape);
router.post('/scrape/batch', scrapeController.batchScrape);

// Crawling endpoints
router.post('/crawl', crawlController.crawl);
router.get('/crawl/:jobId/status', crawlController.getStatus);
router.delete('/crawl/:jobId', crawlController.cancelCrawl);

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

// Engine management endpoints
router.get('/engines', (req: express.Request, res: express.Response) => {
  res.json({
    engines: ['playwright', 'selenium', 'http', 'cache'],
    default: 'playwright'
  });
});

export { router as routes };
