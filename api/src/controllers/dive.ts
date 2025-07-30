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

      const result = await this.diveService.performDive(diveRequest);

      if (result.success) {
        // Generate analysis for the sitemap
        const analysis = result.sitemap 
          ? this.diveService.analyzeSitemap(result.sitemap)
          : null;

        res.json({
          success: true,
          data: {
            sitemap: result.sitemap,
            analysis,
            warnings: result.warnings,
            metadata: result.metadata,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          warnings: result.warnings,
          metadata: result.metadata,
        });
      }
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

      const result = await this.diveService.generateSitemapPreview(url);

      if (result.success) {
        res.json({
          success: true,
          data: result.preview,
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }
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
   * GET /api/dive/progress/:engineId?
   */
  async getDiveProgress(req: Request, res: Response): Promise<void> {
    try {
      const engineId = req.params.engineId;
      
      const progress = await this.diveService.getDiveProgress(engineId);

      if (progress) {
        res.json({
          success: true,
          data: progress,
        });
      } else {
        res.json({
          success: true,
          data: {
            processed: 0,
            queued: 0,
            visited: 0,
          },
          message: 'No active dive in progress',
        });
      }
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
}
