import { SpiderCore } from './SpiderCore';

/**
 * Interface for dive options
 */
export interface DiveOptions {
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  followExternalLinks?: boolean;
  includeAssets?: boolean;
  respectRobotsTxt?: boolean;
  stayWithinBaseUrl?: boolean; // New option to control base URL filtering
  delay?: number;
  userAgent?: string;
  excludePatterns?: string[];
  includePatterns?: string[];
}

/**
 * Interface for page information during diving
 */
export interface PageInfo {
  url: string;
  title: string;
  depth: number;
  statusCode: number;
  contentType: string;
  size: number;
  loadTime: number;
  links: Array<{
    url: string;
    text: string;
    type: 'internal' | 'external' | 'asset';
  }>;
  meta: Record<string, string>;
  headers: Record<string, string>;
  timestamp: Date;
  error?: string;
}

/**
 * Interface for the complete sitemap
 */
export interface SiteMap {
  domain: string;
  startUrl: string;
  pages: PageInfo[];
  totalPages: number;
  totalDepth: number;
  crawlTime: number;
  statistics: {
    internalLinks: number;
    externalLinks: number;
    assets: number;
    errors: number;
    averageLoadTime: number;
  };
  timestamp: Date;
  markdown?: string; // Optional markdown export
}

/**
 * SpiderDiver: Advanced website diving and sitemap generation for SpiderEngine
 */
export class SpiderDiver extends SpiderCore {
  private visited = new Set<string>();
  private queue: Array<{ url: string; depth: number }> = [];
  private sitemap: PageInfo[] = [];
  private domain: string = '';
  private baseUrl: string = '';
  private startTime: number = 0;

  /**
   * Perform a deep dive of a website and generate a detailed sitemap
   */
  async dive(options: DiveOptions): Promise<SiteMap> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.startTime = Date.now();
    this.visited.clear();
    this.queue = [];
    this.sitemap = [];
    
    const startUrl = this.normalizeUrl(options.startUrl);
    const startUrlObj = new URL(startUrl);
    this.domain = startUrlObj.hostname;
    this.baseUrl = `${startUrlObj.protocol}//${startUrlObj.hostname}`;
    
    console.log(`Starting dive on ${startUrl} with max depth ${options.maxDepth} and max pages ${options.maxPages}`);
    console.log(`Base URL for filtering: ${this.baseUrl}`);
    console.log(`Stay within base URL: ${options.stayWithinBaseUrl ?? true}`);
    
    // Add the starting URL to the queue
    this.queue.push({ url: startUrl, depth: 0 });
    
    let pagesProcessed = 0;
    
    while (this.queue.length > 0 && pagesProcessed < options.maxPages) {
      const { url, depth } = this.queue.shift()!;
      
      if (this.visited.has(url) || depth > options.maxDepth) {
        continue;
      }
      
      console.log(`Diving into: ${url} (depth: ${depth})`);
      
      try {
        const pageInfo = await this.analyzePage(url, depth, options);
        this.sitemap.push(pageInfo);
        this.visited.add(url);
        pagesProcessed++;
        
        // Add discovered links to queue if within depth limit
        if (depth < options.maxDepth) {
          for (const link of pageInfo.links) {
            if (this.shouldFollowLink(link, options)) {
              this.queue.push({ url: link.url, depth: depth + 1 });
            }
          }
        }
        
        // Respect delay between requests
        if (options.delay && this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
      } catch (error) {
        console.error(`Error analyzing page ${url}:`, error);
        
        // Add error page to sitemap
        this.sitemap.push({
          url,
          title: '',
          depth,
          statusCode: 0,
          contentType: '',
          size: 0,
          loadTime: 0,
          links: [],
          meta: {},
          headers: {},
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        this.visited.add(url);
        pagesProcessed++;
      }
    }
    
    const crawlTime = Date.now() - this.startTime;
    const statistics = this.calculateStatistics();
    const markdown = this.generateMarkdownSitemap();
    
    return {
      domain: this.domain,
      startUrl: options.startUrl,
      pages: this.sitemap,
      totalPages: this.sitemap.length,
      totalDepth: Math.max(...this.sitemap.map(p => p.depth)),
      crawlTime,
      statistics,
      timestamp: new Date(),
      markdown,
    };
  }

  /**
   * Analyze a single page and extract comprehensive information
   */
  private async analyzePage(url: string, depth: number, options: DiveOptions): Promise<PageInfo> {
    const pageStartTime = Date.now();
    
    // Navigate to the page
    await this.sendCommand('Page.navigate', { url });
    
    // Wait for the page to load
    await this.waitForPageLoad();
    
    // Get response information
    const responseInfo = await this.getResponseInfo();
    
    // Extract page information
    const [title, links, meta] = await Promise.all([
      this.extractPageTitle(),
      this.extractAllLinks(url, options),
      this.extractMetaTags(),
    ]);
    
    const loadTime = Date.now() - pageStartTime;
    
    return {
      url,
      title,
      depth,
      statusCode: responseInfo.statusCode,
      contentType: responseInfo.contentType,
      size: responseInfo.size,
      loadTime,
      links,
      meta,
      headers: responseInfo.headers,
      timestamp: new Date(),
    };
  }

  /**
   * Extract page title
   */
  private async extractPageTitle(): Promise<string> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: 'document.title || ""',
        returnByValue: true,
      });
      return result.result.value || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract all links from the current page
   */
  private async extractAllLinks(currentUrl: string, options: DiveOptions): Promise<Array<{ url: string; text: string; type: 'internal' | 'external' | 'asset' }>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const links = [];
            const currentHost = new URL('${currentUrl}').hostname;
            const baseUrl = '${this.baseUrl}';
            const stayWithinBaseUrl = ${options.stayWithinBaseUrl ?? true};
            
            // Extract anchor links
            document.querySelectorAll('a[href]').forEach(link => {
              try {
                const url = new URL(link.href, '${currentUrl}').href;
                const linkHost = new URL(url).hostname;
                
                // Determine if link is internal, external, or base-external
                let type = 'external';
                if (linkHost === currentHost) {
                  if (stayWithinBaseUrl) {
                    // If base URL filtering is enabled, check if URL starts with base
                    if (url.startsWith(baseUrl)) {
                      type = 'internal';
                    } else {
                      // Same host but outside base URL - mark as external
                      type = 'external';
                    }
                  } else {
                    // If base URL filtering is disabled, all same-host links are internal
                    type = 'internal';
                  }
                }
                
                links.push({
                  url: url,
                  text: (link.textContent || '').trim().substring(0, 100),
                  type: type
                });
              } catch (e) {
                // Invalid URL, skip
              }
            });
            
            ${options.includeAssets ? `
            // Extract asset links if requested
            document.querySelectorAll('img[src], link[href], script[src]').forEach(element => {
              try {
                const url = new URL(element.src || element.href, '${currentUrl}').href;
                const linkHost = new URL(url).hostname;
                
                // For assets, apply the same base URL logic
                let type = 'asset';
                if (stayWithinBaseUrl && linkHost === currentHost && !url.startsWith(baseUrl)) {
                  // Asset is on same host but outside base URL, still mark as asset but note it
                }
                
                links.push({
                  url: url,
                  text: element.alt || element.title || '',
                  type: type
                });
              } catch (e) {
                // Invalid URL, skip
              }
            });
            ` : ''}
            
            return links;
          })()
        `,
        returnByValue: true,
      });
      
      return result.result.value || [];
    } catch (error) {
      console.error('Error extracting links:', error);
      return [];
    }
  }

  /**
   * Extract meta tags from the current page
   */
  private async extractMetaTags(): Promise<Record<string, string>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const meta = {};
            document.querySelectorAll('meta').forEach(tag => {
              const name = tag.getAttribute('name') || 
                          tag.getAttribute('property') || 
                          tag.getAttribute('http-equiv');
              const content = tag.getAttribute('content');
              if (name && content) {
                meta[name] = content;
              }
            });
            return meta;
          })()
        `,
        returnByValue: true,
      });
      
      return result.result.value || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Get response information using Network domain
   */
  private async getResponseInfo(): Promise<{ statusCode: number; contentType: string; size: number; headers: Record<string, string> }> {
    try {
      // This is a simplified version - in a full implementation, you'd track network events
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            return {
              statusCode: 200, // Default, would need network event tracking for accurate value
              contentType: document.contentType || 'text/html',
              size: document.documentElement.outerHTML.length,
              headers: {} // Would need network event tracking for actual headers
            };
          })()
        `,
        returnByValue: true,
      });
      
      return result.result.value || { statusCode: 200, contentType: 'text/html', size: 0, headers: {} };
    } catch (error) {
      return { statusCode: 0, contentType: '', size: 0, headers: {} };
    }
  }

  /**
   * Wait for page to load completely
   */
  private async waitForPageLoad(): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          new Promise((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', resolve);
              // Fallback timeout
              setTimeout(resolve, 10000);
            }
          })
        `,
        awaitPromise: true,
      });
    } catch (error) {
      // Fallback: just wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Determine if a link should be followed based on options
   */
  private shouldFollowLink(link: { url: string; type: 'internal' | 'external' | 'asset' }, options: DiveOptions): boolean {
    // First check: Only follow internal links (which already respect base URL if enabled)
    if (link.type !== 'internal') {
      // Don't follow external links unless specifically requested
      if (link.type === 'external' && !options.followExternalLinks) {
        return false;
      }
      // Don't follow assets unless specifically requested
      if (link.type === 'asset' && !options.includeAssets) {
        return false;
      }
    }
    
    // Second check: Apply base URL filtering only if enabled (default: true)
    const stayWithinBaseUrl = options.stayWithinBaseUrl ?? true;
    if (stayWithinBaseUrl) {
      try {
        const linkUrl = new URL(link.url);
        const linkHost = linkUrl.hostname;
        
        // If it's not the same host as our base, don't follow (unless external links are allowed)
        if (linkHost !== this.domain) {
          return options.followExternalLinks || false;
        }
        
        // If it's the same host, ensure it starts with our base URL
        if (!link.url.startsWith(this.baseUrl)) {
          console.log(`Skipping URL outside base: ${link.url} (base: ${this.baseUrl})`);
          return false;
        }
      } catch (error) {
        // Invalid URL, don't follow
        return false;
      }
    } else {
      // Base URL filtering is disabled - only check host matching for internal links
      try {
        const linkUrl = new URL(link.url);
        const linkHost = linkUrl.hostname;
        
        // If link type is internal but host doesn't match, there's an inconsistency
        if (link.type === 'internal' && linkHost !== this.domain) {
          console.log(`Warning: Internal link with different host: ${link.url}`);
          return false;
        }
        
        // If it's external and external links aren't allowed, don't follow
        if (link.type === 'external' && !options.followExternalLinks) {
          return false;
        }
      } catch (error) {
        // Invalid URL, don't follow
        return false;
      }
    }
    
    // Third check: Apply exclude patterns
    if (options.excludePatterns) {
      for (const pattern of options.excludePatterns) {
        if (new RegExp(pattern).test(link.url)) {
          return false;
        }
      }
    }
    
    // Fourth check: Apply include patterns (if specified, URL must match at least one)
    if (options.includePatterns && options.includePatterns.length > 0) {
      const matches = options.includePatterns.some(pattern => 
        new RegExp(pattern).test(link.url)
      );
      if (!matches) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Normalize URL for consistent comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove fragment and normalize
      urlObj.hash = '';
      return urlObj.href;
    } catch (error) {
      return url;
    }
  }

  /**
   * Calculate statistics for the sitemap
   */
  private calculateStatistics() {
    let internalLinks = 0;
    let externalLinks = 0;
    let assets = 0;
    let errors = 0;
    let totalLoadTime = 0;
    
    for (const page of this.sitemap) {
      if (page.error) {
        errors++;
      }
      
      totalLoadTime += page.loadTime;
      
      for (const link of page.links) {
        switch (link.type) {
          case 'internal':
            internalLinks++;
            break;
          case 'external':
            externalLinks++;
            break;
          case 'asset':
            assets++;
            break;
        }
      }
    }
    
    return {
      internalLinks,
      externalLinks,
      assets,
      errors,
      averageLoadTime: this.sitemap.length > 0 ? totalLoadTime / this.sitemap.length : 0,
    };
  }

  /**
   * Get current dive progress
   */
  getDiveProgress(): { processed: number; queued: number; visited: number } {
    return {
      processed: this.sitemap.length,
      queued: this.queue.length,
      visited: this.visited.size,
    };
  }

  /**
   * Get dive configuration info
   */
  getDiveInfo(): { domain: string; baseUrl: string; visited: number; queued: number } {
    return {
      domain: this.domain,
      baseUrl: this.baseUrl,
      visited: this.visited.size,
      queued: this.queue.length,
    };
  }

  /**
   * Generate a markdown sitemap with titles and links
   */
  private generateMarkdownSitemap(): string {
    const now = new Date();
    const formatDate = (date: Date) => date.toLocaleString();
    
    let markdown = `# Website Sitemap\n\n`;
    markdown += `**Domain:** ${this.domain}\n`;
    markdown += `**Base URL:** ${this.baseUrl}\n`;
    markdown += `**Generated:** ${formatDate(now)}\n`;
    markdown += `**Total Pages:** ${this.sitemap.length}\n`;
    markdown += `**Max Depth:** ${Math.max(...this.sitemap.map(p => p.depth), 0)}\n\n`;
    
    // Group pages by depth
    const pagesByDepth = new Map<number, PageInfo[]>();
    for (const page of this.sitemap) {
      if (!pagesByDepth.has(page.depth)) {
        pagesByDepth.set(page.depth, []);
      }
      pagesByDepth.get(page.depth)!.push(page);
    }
    
    // Sort depths
    const sortedDepths = Array.from(pagesByDepth.keys()).sort((a, b) => a - b);
    
    for (const depth of sortedDepths) {
      const pages = pagesByDepth.get(depth)!;
      const indent = '  '.repeat(depth);
      
      markdown += `## ${depth === 0 ? 'Root Level' : `Depth ${depth}`}\n\n`;
      
      for (const page of pages) {
        const statusIcon = page.error ? '❌' : page.statusCode === 200 ? '✅' : '⚠️';
        const title = page.title || 'Untitled Page';
        const cleanTitle = title.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        
        markdown += `${indent}- ${statusIcon} [${cleanTitle}](${page.url})`;
        
        // Add additional info
        const info = [];
        if (page.statusCode !== 200) {
          info.push(`Status: ${page.statusCode}`);
        }
        if (page.error) {
          info.push(`Error: ${page.error}`);
        }
        if (page.loadTime > 3000) {
          info.push(`Slow: ${page.loadTime}ms`);
        }
        if (page.links.length > 0) {
          info.push(`${page.links.length} links`);
        }
        
        if (info.length > 0) {
          markdown += ` *(${info.join(', ')})*`;
        }
        
        markdown += '\n';
      }
      
      markdown += '\n';
    }
    
    // Add statistics section
    markdown += `## Statistics\n\n`;
    const stats = this.calculateStatistics();
    markdown += `- **Internal Links:** ${stats.internalLinks}\n`;
    markdown += `- **External Links:** ${stats.externalLinks}\n`;
    markdown += `- **Assets:** ${stats.assets}\n`;
    markdown += `- **Errors:** ${stats.errors}\n`;
    markdown += `- **Average Load Time:** ${stats.averageLoadTime.toFixed(0)}ms\n\n`;
    
    // Add all pages list
    markdown += `## All Pages (Alphabetical)\n\n`;
    const sortedPages = [...this.sitemap].sort((a, b) => {
      const titleA = a.title || a.url;
      const titleB = b.title || b.url;
      return titleA.localeCompare(titleB);
    });
    
    for (const page of sortedPages) {
      const statusIcon = page.error ? '❌' : page.statusCode === 200 ? '✅' : '⚠️';
      const title = page.title || 'Untitled Page';
      const cleanTitle = title.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      
      markdown += `- ${statusIcon} [${cleanTitle}](${page.url}) *(Depth: ${page.depth})*\n`;
    }
    
    markdown += `\n---\n*Generated by WebCrawl Spider Engine on ${formatDate(now)}*\n`;
    
    return markdown;
  }
}
