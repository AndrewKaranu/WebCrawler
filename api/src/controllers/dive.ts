import { Request, Response } from 'express';
import { DiveService, DiveRequest } from '../services/DiveService';

/**
 * Controller for website diving and sitemap generation endpoints
 */
export class DiveController {
  private diveService: DiveService;

  constructor() {
    this.diveService = new DiveService();
  }

  /**
   * Perform a comprehensive website dive
   * POST /api/dive
   */
  async performDive(req: Request, res: Response): Promise<void> {
    try {
      const diveRequest: DiveRequest = {
        url: req.body.url,
        maxDepth: req.body.maxDepth,
        maxPages: req.body.maxPages,
        followExternalLinks: req.body.followExternalLinks,
        includeAssets: req.body.includeAssets,
        respectRobotsTxt: req.body.respectRobotsTxt,
        stayWithinBaseUrl: req.body.stayWithinBaseUrl,
        delay: req.body.delay,
        userAgent: req.body.userAgent,
        excludePatterns: req.body.excludePatterns,
        includePatterns: req.body.includePatterns,
        engineType: req.body.engineType,
      };

      console.log('Received dive request:', {
        url: diveRequest.url,
        maxDepth: diveRequest.maxDepth,
        maxPages: diveRequest.maxPages,
      });

      // Enqueue a full dive job
      const { enqueueJob } = require('../services/JobQueueService');
      const job = await enqueueJob('diveFull', { request: diveRequest });
      // Return job ID for tracking
      res.json({ success: true, jobId: job.id });
    } catch (error) {
      console.error('Error in dive controller:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error during dive operation'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate a quick sitemap preview
   * POST /api/dive/preview
   */
  async generatePreview(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          errors: ['URL is required'],
        });
        return;
      }

      console.log(`Generating preview for: ${url}`);

      // Enqueue a preview dive job
      const { enqueueJob } = require('../services/JobQueueService');
      const job = await enqueueJob('divePreview', { url, options: { maxDepth: 1, maxPages: 10 } });
      
      // Return job ID for tracking
      res.json({
        success: true,
        jobId: job.id,
        message: 'Preview generation started'
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error during preview generation'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get dive progress for monitoring
   * GET /api/dive/progress/:jobId
   */
  async getDiveProgress(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        res.status(400).json({
          success: false,
          errors: ['Job ID is required'],
        });
        return;
      }

      const { getJobStatus } = require('../services/JobQueueService');
      const status = await getJobStatus(jobId);

      if (!status) {
        res.status(404).json({
          success: false,
          errors: ['Job not found'],
        });
        return;
      }

      res.json({
        success: true,
        data: {
          jobId: status.id,
          jobName: status.name,
          state: status.state,
          progress: status.progress,
          result: status.result,
          error: status.failedReason
        },
      });
    } catch (error) {
      console.error('Error getting dive progress:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error getting dive progress'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate dive parameters without performing the dive
   * POST /api/dive/validate
   */
  async validateDiveRequest(req: Request, res: Response): Promise<void> {
    try {
      const diveRequest: DiveRequest = {
        url: req.body.url,
        maxDepth: req.body.maxDepth,
        maxPages: req.body.maxPages,
        followExternalLinks: req.body.followExternalLinks,
        includeAssets: req.body.includeAssets,
        respectRobotsTxt: req.body.respectRobotsTxt,
        stayWithinBaseUrl: req.body.stayWithinBaseUrl,
        delay: req.body.delay,
        userAgent: req.body.userAgent,
        excludePatterns: req.body.excludePatterns,
        includePatterns: req.body.includePatterns,
        engineType: req.body.engineType,
      };

      // Use the same validation logic as the service
      const validationResult = (this.diveService as any).validateDiveRequest(diveRequest);

      res.json({
        success: validationResult.isValid,
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        processedOptions: validationResult.processedOptions,
      });
    } catch (error) {
      console.error('Error validating dive request:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error during validation'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get dive configuration options and limits
   * GET /api/dive/config
   */
  async getDiveConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        defaults: {
          maxDepth: 3,
          maxPages: 50,
          delay: 1000,
          followExternalLinks: false,
          includeAssets: false,
          respectRobotsTxt: true,
        },
        limits: {
          maxAllowedDepth: 10,
          maxAllowedPages: 1000,
          minDelay: 100,
        },
        availableEngines: ['spider', 'puppeteer'],
        supportedOptions: [
          'url',
          'maxDepth',
          'maxPages',
          'followExternalLinks',
          'includeAssets',
          'respectRobotsTxt',
          'delay',
          'userAgent',
          'excludePatterns',
          'includePatterns',
          'engineType',
        ],
      };

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error getting dive config:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error getting dive configuration'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Analyze an existing sitemap
   * POST /api/dive/analyze
   */
  async analyzeSitemap(req: Request, res: Response): Promise<void> {
    try {
      const { sitemap } = req.body;

      if (!sitemap) {
        res.status(400).json({
          success: false,
          errors: ['Sitemap data is required'],
        });
        return;
      }

      const analysis = this.diveService.analyzeSitemap(sitemap);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error analyzing sitemap:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error during sitemap analysis'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all saved sitemaps
   * GET /api/dive/sitemaps
   */
  async getAllSitemaps(req: Request, res: Response): Promise<void> {
    try {
      const sitemaps = await this.diveService.getAllSitemaps();
      console.log(`Retrieved ${sitemaps.length} sitemaps`);
      
      res.json({
        success: true,
        data: sitemaps,
        count: sitemaps.length
      });
    } catch (error) {
      console.error('Error retrieving sitemaps:', error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error while retrieving sitemaps'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  /**
   * Get a specific sitemap by ID
   * GET /api/dive/sitemaps/:id
   */
  async getSitemapById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          errors: ['Sitemap ID is required'],
        });
        return;
      }
      
      const sitemapEntry = await this.diveService.getSitemapById(id);
      
      if (!sitemapEntry) {
        res.status(404).json({
          success: false,
          errors: [`Sitemap with ID ${id} not found`],
        });
        return;
      }
      
      res.json({
        success: true,
        data: sitemapEntry
      });
    } catch (error) {
      console.error(`Error retrieving sitemap with ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        errors: ['Internal server error while retrieving sitemap'],
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
