import { EngineFactory } from './scraper/EngineFactory';
import { DiveOptions, SiteMap } from './scraper/SpiderEngine/SpiderDiver';

/**
 * Interface for dive request validation
 */
export interface DiveRequest {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  followExternalLinks?: boolean;
  includeAssets?: boolean;
  respectRobotsTxt?: boolean;
  stayWithinBaseUrl?: boolean;
  delay?: number;
  userAgent?: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  engineType?: 'spider' | 'puppeteer';
}

/**
 * Interface for dive validation result
 */
interface DiveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  processedOptions?: DiveOptions;
}

/**
 * DiveService: Service layer for website diving and sitemap generation
 */
export class DiveService {
  private static readonly DEFAULT_MAX_DEPTH = 3;
  private static readonly DEFAULT_MAX_PAGES = 50;
  private static readonly DEFAULT_DELAY = 1000; // 1 second between requests
  private static readonly MAX_ALLOWED_DEPTH = 10;
  private static readonly MAX_ALLOWED_PAGES = 1000;
  private static readonly MIN_DELAY = 100; // Minimum 100ms delay

  /**
   * Validate and normalize dive request parameters
   */
  private validateDiveRequest(request: DiveRequest): DiveValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate URL
    if (!request.url) {
      errors.push('URL is required');
    } else {
      try {
        new URL(request.url);
      } catch (error) {
        errors.push('Invalid URL format');
      }
    }

    // Validate and normalize depth
    let maxDepth = request.maxDepth ?? DiveService.DEFAULT_MAX_DEPTH;
    if (maxDepth < 0) {
      errors.push('Max depth cannot be negative');
    } else if (maxDepth > DiveService.MAX_ALLOWED_DEPTH) {
      warnings.push(`Max depth capped at ${DiveService.MAX_ALLOWED_DEPTH}`);
      maxDepth = DiveService.MAX_ALLOWED_DEPTH;
    }

    // Validate and normalize pages
    let maxPages = request.maxPages ?? DiveService.DEFAULT_MAX_PAGES;
    if (maxPages < 1) {
      errors.push('Max pages must be at least 1');
    } else if (maxPages > DiveService.MAX_ALLOWED_PAGES) {
      warnings.push(`Max pages capped at ${DiveService.MAX_ALLOWED_PAGES}`);
      maxPages = DiveService.MAX_ALLOWED_PAGES;
    }

    // Validate and normalize delay
    let delay = request.delay ?? DiveService.DEFAULT_DELAY;
    if (delay < DiveService.MIN_DELAY) {
      warnings.push(`Delay increased to minimum ${DiveService.MIN_DELAY}ms`);
      delay = DiveService.MIN_DELAY;
    }

    // Validate patterns
    if (request.excludePatterns) {
      for (const pattern of request.excludePatterns) {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(`Invalid exclude pattern: ${pattern}`);
        }
      }
    }

    if (request.includePatterns) {
      for (const pattern of request.includePatterns) {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(`Invalid include pattern: ${pattern}`);
        }
      }
    }

    // Performance warnings
    if (maxDepth > 5 && maxPages > 200) {
      warnings.push('High depth and page count may result in very long crawl times');
    }

    if (delay < 500) {
      warnings.push('Short delays may overload the target server');
    }

    const isValid = errors.length === 0;
    const processedOptions: DiveOptions | undefined = isValid ? {
      startUrl: request.url,
      maxDepth,
      maxPages,
      followExternalLinks: request.followExternalLinks ?? false,
      includeAssets: request.includeAssets ?? false,
      respectRobotsTxt: request.respectRobotsTxt ?? true,
      stayWithinBaseUrl: request.stayWithinBaseUrl ?? true,
      delay,
      userAgent: request.userAgent,
      excludePatterns: request.excludePatterns,
      includePatterns: request.includePatterns,
    } : undefined;

    return {
      isValid,
      errors,
      warnings,
      processedOptions,
    };
  }

  /**
   * Perform a website dive with comprehensive validation and error handling
   */
  async performDive(request: DiveRequest): Promise<{
    success: boolean;
    sitemap?: SiteMap;
    errors?: string[];
    warnings?: string[];
    metadata?: {
      requestProcessedAt: Date;
      validationResult: DiveValidationResult;
      engineUsed: string;
    };
  }> {
    const requestProcessedAt = new Date();
    
    // Validate the request
    const validationResult = this.validateDiveRequest(request);
    if (!validationResult.isValid) {
      return {
        success: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        metadata: {
          requestProcessedAt,
          validationResult,
          engineUsed: 'none',
        },
      };
    }

    const engine = await EngineFactory.getEngine(request.engineType || 'spider');
    
    try {
      console.log(`Starting dive for ${request.url} with engine: ${engine.name}`);
      
      // Perform the dive
      const sitemap = await (engine as any).dive(validationResult.processedOptions!);
      
      console.log(`Dive completed: ${sitemap.totalPages} pages processed`);
      
      return {
        success: true,
        sitemap,
        warnings: validationResult.warnings,
        metadata: {
          requestProcessedAt,
          validationResult,
          engineUsed: engine.name,
        },
      };
      
    } catch (error) {
      console.error('Error during dive:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred during dive'],
        warnings: validationResult.warnings,
        metadata: {
          requestProcessedAt,
          validationResult,
          engineUsed: engine.name,
        },
      };
    } finally {
      // Cleanup the engine
      try {
        await engine.cleanup();
      } catch (cleanupError) {
        console.error('Error during engine cleanup:', cleanupError);
      }
    }
  }

  /**
   * Get dive progress for monitoring long-running dives
   */
  async getDiveProgress(engineId?: string): Promise<{
    processed: number;
    queued: number;
    visited: number;
    diveInfo?: { domain: string; baseUrl: string; visited: number; queued: number };
  } | null> {
    // In a full implementation, you'd track engines by ID
    // For now, this is a placeholder that would need engine management
    try {
      const engine = await EngineFactory.getEngine('spider');
      if ((engine as any).getDiveProgress) {
        const progress = (engine as any).getDiveProgress();
        const diveInfo = (engine as any).getDiveInfo ? (engine as any).getDiveInfo() : undefined;
        return { ...progress, diveInfo };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate sitemap preview (limited dive for quick analysis)
   */
  async generateSitemapPreview(url: string): Promise<{
    success: boolean;
    preview?: {
      title: string;
      links: Array<{ url: string; text: string; type: string }>;
      meta: Record<string, string>;
      pageCount: number;
    };
    errors?: string[];
  }> {
    const previewRequest: DiveRequest = {
      url,
      maxDepth: 1,
      maxPages: 10,
      followExternalLinks: false,
      includeAssets: false,
      stayWithinBaseUrl: true,
      delay: 500,
    };

    const result = await this.performDive(previewRequest);
    
    if (!result.success || !result.sitemap) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    const firstPage = result.sitemap.pages[0];
    
    return {
      success: true,
      preview: {
        title: firstPage?.title || '',
        links: firstPage?.links || [],
        meta: firstPage?.meta || {},
        pageCount: result.sitemap.totalPages,
      },
    };
  }

  /**
   * Analyze a sitemap to provide insights
   */
  analyzeSitemap(sitemap: SiteMap): {
    insights: string[];
    recommendations: string[];
    structure: {
      depthDistribution: Record<number, number>;
      pageTypes: Record<string, number>;
      commonPaths: string[];
    };
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const depthDistribution: Record<number, number> = {};
    const pageTypes: Record<string, number> = {};
    const pathSegments: Record<string, number> = {};

    // Analyze depth distribution
    for (const page of sitemap.pages) {
      depthDistribution[page.depth] = (depthDistribution[page.depth] || 0) + 1;
      
      // Analyze page types by content type
      const contentType = page.contentType.split(';')[0];
      pageTypes[contentType] = (pageTypes[contentType] || 0) + 1;
      
      // Analyze URL structure
      try {
        const url = new URL(page.url);
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        for (const part of pathParts) {
          pathSegments[part] = (pathSegments[part] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid URLs
      }
    }

    // Generate insights
    const totalPages = sitemap.totalPages;
    const errorPages = sitemap.statistics.errors;
    const avgLoadTime = sitemap.statistics.averageLoadTime;

    insights.push(`Discovered ${totalPages} pages across ${sitemap.totalDepth + 1} depth levels`);
    insights.push(`Average page load time: ${avgLoadTime.toFixed(0)}ms`);
    
    if (errorPages > 0) {
      insights.push(`Found ${errorPages} pages with errors (${((errorPages / totalPages) * 100).toFixed(1)}%)`);
    }

    if (sitemap.statistics.externalLinks > 0) {
      insights.push(`${sitemap.statistics.externalLinks} external links discovered`);
    }

    // Generate recommendations
    if (avgLoadTime > 3000) {
      recommendations.push('Page load times are high - consider optimizing website performance');
    }

    if (errorPages / totalPages > 0.1) {
      recommendations.push('High error rate detected - review broken links and server responses');
    }

    const maxDepthPages = depthDistribution[sitemap.totalDepth] || 0;
    if (maxDepthPages / totalPages > 0.3) {
      recommendations.push('Many pages at maximum depth - consider increasing crawl depth');
    }

    // Get common paths
    const commonPaths = Object.entries(pathSegments)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path]) => path);

    return {
      insights,
      recommendations,
      structure: {
        depthDistribution,
        pageTypes,
        commonPaths,
      },
    };
  }
}
