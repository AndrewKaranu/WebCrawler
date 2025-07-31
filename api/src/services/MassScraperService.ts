import { enqueueJob } from './JobQueueService';
import { ScrapeOptions } from '../models/index';

export interface MassScrapeBatch {
  id: string;
  name?: string;
  urls: string[];
  options: ScrapeOptions;
  jobIds: string[];
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

export interface MassScrapeRequest {
  urls: string[];
  batchName?: string;
  options?: Partial<ScrapeOptions>;
}

export interface MassScrapeResult {
  batchId: string;
  jobIds: string[];
  total: number;
  message: string;
}

class MassScraperService {
  private batches = new Map<string, MassScrapeBatch>();
  private batchCounter = 1;

  /**
   * Create a mass scrape batch - enqueues individual scrape jobs for each URL
   */
  async createMassScrapeBatch(request: MassScrapeRequest): Promise<MassScrapeResult> {
    const { urls, batchName, options = {} } = request;
    
    if (!urls || urls.length === 0) {
      throw new Error('URLs array is required and cannot be empty');
    }

    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      throw new Error('No valid URLs provided');
    }

    const batchId = `batch-${this.batchCounter++}`;
    const jobIds: string[] = [];

    // Default scrape options
    const scrapeOptions: ScrapeOptions = {
      engine: 'spider',
      timeout: 30000,
      screenshot: false,
      fullPage: false,
      ...options,
      url: '' // Will be set per job
    };

    console.log(`Creating mass scrape batch ${batchId} for ${validUrls.length} URLs`);

    // Create individual scrape jobs for each URL
    for (const url of validUrls) {
      try {
        const job = await enqueueJob('scrapePage', {
          url,
          options: { ...scrapeOptions, url }
        });
        jobIds.push(job.id);
      } catch (error) {
        console.error(`Failed to enqueue job for URL ${url}:`, error);
        // Continue with other URLs even if one fails
      }
    }

    // Create batch tracking object
    const batch: MassScrapeBatch = {
      id: batchId,
      name: batchName || `Mass Scrape ${batchId}`,
      urls: validUrls,
      options: scrapeOptions,
      jobIds,
      createdAt: new Date(),
      status: 'processing',
      progress: {
        total: jobIds.length,
        completed: 0,
        failed: 0,
        pending: jobIds.length
      }
    };

    this.batches.set(batchId, batch);

    return {
      batchId,
      jobIds,
      total: jobIds.length,
      message: `Mass scrape batch created with ${jobIds.length} jobs`
    };
  }

  /**
   * Get batch status and progress
   */
  async getBatchStatus(batchId: string): Promise<MassScrapeBatch | null> {
    const batch = this.batches.get(batchId);
    if (!batch) return null;

    // Update progress by checking individual job statuses
    await this.updateBatchProgress(batch);
    
    return batch;
  }

  /**
   * Get all batches
   */
  async getAllBatches(): Promise<MassScrapeBatch[]> {
    const batches = Array.from(this.batches.values());
    
    // Update progress for all batches
    for (const batch of batches) {
      await this.updateBatchProgress(batch);
    }
    
    return batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get batch results - collect all completed job results
   */
  async getBatchResults(batchId: string): Promise<{ batch: MassScrapeBatch; results: any[] } | null> {
    const batch = this.batches.get(batchId);
    if (!batch) return null;

    await this.updateBatchProgress(batch);

    // Get results from all jobs in the batch
    const { getJobStatus } = require('./JobQueueService');
    const results = [];

    for (const jobId of batch.jobIds) {
      const jobStatus = await getJobStatus(jobId);
      if (jobStatus) {
        results.push({
          jobId,
          url: batch.urls[batch.jobIds.indexOf(jobId)],
          state: jobStatus.state,
          result: jobStatus.result,
          error: jobStatus.failedReason
        });
      }
    }

    return { batch, results };
  }

  /**
   * Cancel a batch - attempts to cancel all pending jobs
   */
  async cancelBatch(batchId: string): Promise<boolean> {
    const batch = this.batches.get(batchId);
    if (!batch) return false;

    const { jobQueue } = require('./JobQueueService');
    let cancelledCount = 0;

    for (const jobId of batch.jobIds) {
      try {
        const success = await jobQueue.removeJob(jobId);
        if (success) cancelledCount++;
      } catch (error) {
        console.error(`Failed to cancel job ${jobId}:`, error);
      }
    }

    batch.status = 'failed';
    console.log(`Cancelled ${cancelledCount} jobs from batch ${batchId}`);
    
    return cancelledCount > 0;
  }

  /**
   * Delete a batch from tracking
   */
  async deleteBatch(batchId: string): Promise<boolean> {
    return this.batches.delete(batchId);
  }

  /**
   * Update batch progress by checking individual job statuses
   */
  private async updateBatchProgress(batch: MassScrapeBatch): Promise<void> {
    const { getJobStatus } = require('./JobQueueService');
    
    let completed = 0;
    let failed = 0;
    let pending = 0;

    for (const jobId of batch.jobIds) {
      const jobStatus = await getJobStatus(jobId);
      if (jobStatus) {
        switch (jobStatus.state) {
          case 'completed':
            completed++;
            break;
          case 'failed':
            failed++;
            break;
          case 'waiting':
          case 'active':
            pending++;
            break;
        }
      }
    }

    batch.progress = {
      total: batch.jobIds.length,
      completed,
      failed,
      pending
    };

    // Update batch status
    if (completed + failed === batch.jobIds.length) {
      batch.status = failed === batch.jobIds.length ? 'failed' : 'completed';
    } else {
      batch.status = 'processing';
    }
  }

  /**
   * Create batch from dive results - for connecting to diver later
   */
  async createBatchFromDiveResults(
    diveJobId: string, 
    selectedUrls: string[], 
    batchName?: string, 
    options?: any
  ): Promise<MassScrapeResult> {
    // TODO: In future, we could validate the dive job and extract URLs from dive results
    // For now, we'll just use the provided selectedUrls
    
    const request: MassScrapeRequest = {
      urls: selectedUrls,
      batchName: batchName || `Dive batch ${diveJobId} - ${new Date().toISOString()}`,
      options: options || {}
    };

    return this.createMassScrapeBatch(request);
  }
}

// Export singleton instance
export const massScraperService = new MassScraperService();
