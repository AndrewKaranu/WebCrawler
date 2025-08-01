import { Request, Response } from 'express';
import { CacheService } from '../services/CacheService';

export class ContentController {
  private cacheService = CacheService.getInstance();

  /**
   * Get all cached content entries with metadata
   */
  getAllContent = async (req: Request, res: Response) => {
    try {
      const { search, domain, status, sortBy = 'timestamp', order = 'desc', page = 1, limit = 20 } = req.query;
      
      // Get all cache keys
      const allKeys = this.cacheService.getAllKeys();
      const entries = [];

      for (const key of allKeys) {
        const value = this.cacheService.getCacheValue(key);
        if (value && typeof value === 'object') {
          // Extract metadata from cached scrape results
          const entry = this.extractContentEntry(key, value);
          if (entry) {
            entries.push(entry);
          }
        }
      }

      // Apply filters
      let filteredEntries = entries;

      if (search) {
        const searchTerm = String(search).toLowerCase();
        filteredEntries = entries.filter(entry => 
          entry.title?.toLowerCase().includes(searchTerm) ||
          entry.url?.toLowerCase().includes(searchTerm) ||
          entry.text?.toLowerCase().includes(searchTerm)
        );
      }

      if (domain && domain !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.domain === domain);
      }

      if (status && status !== 'all') {
        if (status === 'success') {
          filteredEntries = filteredEntries.filter(entry => 
            entry.statusCode >= 200 && entry.statusCode < 300
          );
        } else if (status === 'error') {
          filteredEntries = filteredEntries.filter(entry => entry.statusCode >= 400);
        }
      }

      // Sort entries
      filteredEntries.sort((a, b) => {
        const sortField = String(sortBy);
        let aValue = a[sortField as keyof typeof a];
        let bValue = b[sortField as keyof typeof b];

        if (sortField === 'timestamp') {
          aValue = new Date(aValue as string).getTime();
          bValue = new Date(bValue as string).getTime();
        }

        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return order === 'desc' ? -comparison : comparison;
      });

      // Paginate
      const pageNum = parseInt(String(page));
      const limitNum = parseInt(String(limit));
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          entries: paginatedEntries,
          pagination: {
            total: filteredEntries.length,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(filteredEntries.length / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Error getting content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve content'
      });
    }
  };

  /**
   * Get content by cache key
   */
  getContentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const content = this.cacheService.getCacheValue(id);

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found'
        });
        return;
      }

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error getting content by id:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve content'
      });
    }
  };

  /**
   * Delete content by cache key
   */
  deleteContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const deleted = this.cacheService.deleteCacheEntry(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Content not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete content'
      });
    }
  };

  /**
   * Export content as JSON
   */
  exportContent = async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      const content = [];

      if (Array.isArray(ids)) {
        for (const id of ids) {
          const cachedContent = this.cacheService.getCacheValue(id);
          if (cachedContent) {
            content.push({
              id,
              data: cachedContent,
              exportedAt: new Date().toISOString()
            });
          }
        }
      } else {
        // Export all content
        const allKeys = this.cacheService.getAllKeys();
        for (const key of allKeys) {
          const cachedContent = this.cacheService.getCacheValue(key);
          if (cachedContent) {
            content.push({
              id: key,
              data: cachedContent,
              exportedAt: new Date().toISOString()
            });
          }
        }
      }

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalEntries: content.length,
          exportedBy: 'WebCrawler Cache Export'
        },
        content
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="webcrawler-cache-export.json"');
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export content'
      });
    }
  };

  /**
   * Get unique domains from cached content
   */
  getDomains = async (req: Request, res: Response) => {
    try {
      const allKeys = this.cacheService.getAllKeys();
      const domains = new Set<string>();

      for (const key of allKeys) {
        const value = this.cacheService.getCacheValue(key);
        if (value && typeof value === 'object') {
          const entry = this.extractContentEntry(key, value);
          if (entry?.domain) {
            domains.add(entry.domain);
          }
        }
      }

      res.json({
        success: true,
        data: Array.from(domains).sort()
      });
    } catch (error) {
      console.error('Error getting domains:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve domains'
      });
    }
  };

  /**
   * Extract content entry metadata from cached value
   */
  private extractContentEntry(key: string, value: any): any {
    try {
      // Handle different types of cached content
      if (value.url || value.title || value.text) {
        // Direct scrape result
        return {
          id: key,
          url: value.url || '',
          title: value.title || 'Untitled',
          text: value.text || '',
          timestamp: value.timestamp || new Date(),
          statusCode: value.statusCode || 200,
          loadTime: value.loadTime || 0,
          contentType: value.contentType || 'text/html',
          size: this.calculateSize(value),
          domain: value.url ? new URL(value.url).hostname : '',
          linksCount: value.links?.length || 0,
          imagesCount: value.images?.length || 0,
          cached: true
        };
      } else if (value.results && Array.isArray(value.results)) {
        // Batch scrape results - use first result for summary
        const firstResult = value.results[0];
        if (firstResult) {
          return {
            id: key,
            url: firstResult.url || '',
            title: `Batch Scrape (${value.results.length} URLs)`,
            text: firstResult.text || '',
            timestamp: value.timestamp || new Date(),
            statusCode: firstResult.statusCode || 200,
            loadTime: value.totalTime || 0,
            contentType: 'batch/results',
            size: this.calculateSize(value),
            domain: firstResult.url ? new URL(firstResult.url).hostname : '',
            linksCount: value.results.reduce((sum: number, r: any) => sum + (r.links?.length || 0), 0),
            imagesCount: value.results.reduce((sum: number, r: any) => sum + (r.images?.length || 0), 0),
            cached: true
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting content entry:', error);
      return null;
    }
  }

  /**
   * Calculate approximate size of cached content
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }
}
