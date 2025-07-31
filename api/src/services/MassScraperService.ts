import { enqueueJob } from './JobQueueService';
import { ScrapeOptions } from '../models/index';
import { BATCHES_DIR, saveData, loadData, listDataFiles, deleteData, initStorage } from './PersistentStorage';

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
  corpusId?: string; // ID of the associated corpus
}

export interface MassScrapeRequest {
  urls: string[];
  batchName?: string;
  options?: Partial<ScrapeOptions>;
  createCorpus?: boolean;
  corpusName?: string;
  corpusDescription?: string;
  corpusTags?: string[];
}

export interface MassScrapeResult {
  batchId: string;
  jobIds: string[];
  total: number;
  corpusId?: string;
  message: string;
}

class MassScraperService {
  private batches = new Map<string, MassScrapeBatch>();
  private batchCounter = 1;
  
  constructor() {
    // Initialize storage and load batches on startup
    this.initialize();
  }
  
  /**
   * Initialize service and load saved batches
   */
  private async initialize(): Promise<void> {
    try {
      await initStorage();
      
      // Load all saved batches
      const batchIds = await listDataFiles(BATCHES_DIR);
      console.log(`Loading ${batchIds.length} saved batches...`);
      
      for (const batchId of batchIds) {
        const batch = await loadData<MassScrapeBatch>(BATCHES_DIR, batchId);
        if (batch) {
          // Ensure createdAt is a Date object after loading from JSON
          batch.createdAt = new Date(batch.createdAt as any);
          this.batches.set(batch.id, batch);
          
          // Update batch counter to ensure new batches don't clash with loaded ones
          const batchNum = parseInt(batch.id.replace('batch-', ''));
          if (!isNaN(batchNum) && batchNum >= this.batchCounter) {
            this.batchCounter = batchNum + 1;
          }
        }
      }
      
      console.log(`Loaded ${this.batches.size} batches from persistent storage`);
    } catch (error) {
      console.error('Error initializing mass scraper service:', error);
    }
  }

  /**
   * Create a mass scrape batch - enqueues individual scrape jobs for each URL
   */
  async createMassScrapeBatch(request: MassScrapeRequest): Promise<MassScrapeResult> {
    const { urls, batchName, options = {}, createCorpus = false, corpusName, corpusDescription, corpusTags = [] } = request;
    
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
      bypassCache: false, // Default to using cache
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
    
    // Save batch to persistent storage
    await saveData(BATCHES_DIR, batchId, batch);

    // Create corpus if requested
    let corpusId;
    if (createCorpus) {
      try {
        const { corpusController } = require('../controllers/corpus');
        const corpusResult = await corpusController.createCorpus({
          body: {
            name: corpusName || batchName || `Corpus for ${batchId}`,
            description: corpusDescription || `Auto-generated corpus for mass scrape batch ${batchId}`,
            sourceId: batchId,
            sourceType: 'mass-scrape',
            tags: corpusTags
          }
        }, {
          json: (data: any) => data,
          status: () => ({ json: (data: any) => data })
        });

        if (corpusResult.success) {
          corpusId = corpusResult.data.id;
          batch.corpusId = corpusId;
          console.log(`Created corpus ${corpusId} for batch ${batchId}`);
        }
      } catch (error) {
        console.error(`Failed to create corpus for batch ${batchId}:`, error);
      }
    }

    return {
      batchId,
      jobIds,
      total: jobIds.length,
      corpusId,
      message: `Mass scrape batch created with ${jobIds.length} jobs${corpusId ? ` and linked to corpus ${corpusId}` : ''}`
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
    
    // Update batch status in persistent storage
    await saveData(BATCHES_DIR, batchId, batch);
    
    return cancelledCount > 0;
  }

  /**
   * Delete a batch from tracking
   */
  async deleteBatch(batchId: string): Promise<boolean> {
    const deleted = this.batches.delete(batchId);
    
    if (deleted) {
      // Remove from persistent storage
      await deleteData(BATCHES_DIR, batchId);
      console.log(`Deleted batch ${batchId} from tracking and storage`);
    }
    
    return deleted;
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
    const oldStatus = batch.status;
    if (completed + failed === batch.jobIds.length) {
      batch.status = failed === batch.jobIds.length ? 'failed' : 'completed';
      
      // If batch just completed and has an associated corpus, add results to corpus
      if (oldStatus !== 'completed' && batch.status === 'completed' && batch.corpusId) {
        console.log(`Batch ${batch.id} completed, adding results to corpus ${batch.corpusId}`);
        this.addBatchResultsToCorpus(batch.id, batch.corpusId)
          .then(success => {
            if (success) {
              console.log(`Successfully added batch ${batch.id} results to corpus ${batch.corpusId}`);
            } else {
              console.error(`Failed to add batch ${batch.id} results to corpus ${batch.corpusId}`);
            }
          })
          .catch(error => {
            console.error(`Error adding batch results to corpus: ${error}`);
          });
      }
    } else {
      batch.status = 'processing';
    }
    
    // Save updated batch status to persistent storage
    await saveData(BATCHES_DIR, batch.id, batch);
  }

  /**
   * Create batch from dive results - for connecting to diver later
   */
  async createBatchFromDiveResults(
    diveJobId: string, 
    selectedUrls: string[], 
    batchName?: string, 
    options?: any,
    createCorpus: boolean = false
  ): Promise<MassScrapeResult> {
    // TODO: In future, we could validate the dive job and extract URLs from dive results
    // For now, we'll just use the provided selectedUrls
    
    const request: MassScrapeRequest = {
      urls: selectedUrls,
      batchName: batchName || `Dive batch ${diveJobId} - ${new Date().toISOString()}`,
      options: options || {},
      createCorpus,
      corpusName: createCorpus ? `Corpus from dive ${diveJobId}` : undefined,
      corpusDescription: createCorpus ? `Content collected from dive job ${diveJobId}` : undefined,
      corpusTags: createCorpus ? ['dive-source'] : undefined
    };

    return this.createMassScrapeBatch(request);
  }

  /**
   * Create a corpus from an existing batch
   */
  async createCorpusFromBatch(
    batchId: string,
    corpusName?: string,
    corpusDescription?: string,
    corpusTags: string[] = []
  ): Promise<string | null> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    // If batch already has a corpus, return it
    if (batch.corpusId) {
      return batch.corpusId;
    }

    try {
      const { corpusController } = require('../controllers/corpus');
      const corpusResult = await corpusController.createCorpus({
        body: {
          name: corpusName || `Corpus for ${batchId}`,
          description: corpusDescription || `Auto-generated corpus for mass scrape batch ${batchId}`,
          sourceId: batchId,
          sourceType: 'mass-scrape',
          tags: corpusTags
        }
      }, {
        json: (data: any) => data,
        status: () => ({ json: (data: any) => data })
      });

      if (corpusResult.success) {
        const corpusId = corpusResult.data.id;
        batch.corpusId = corpusId;
        console.log(`Created corpus ${corpusId} for batch ${batchId}`);
        return corpusId;
      }
    } catch (error) {
      console.error(`Failed to create corpus for batch ${batchId}:`, error);
    }

    return null;
  }

  /**
   * Add batch results to a corpus
   */
  async addBatchResultsToCorpus(batchId: string, corpusId: string): Promise<boolean> {
    console.log(`addBatchResultsToCorpus invoked for batchId=${batchId}, corpusId=${corpusId}`);
    const batchResults = await this.getBatchResults(batchId);
    if (!batchResults) {
      throw new Error(`Failed to get results for batch ${batchId}`);
    }

    const fs = require('fs/promises');
    const path = require('path');
    
    // Link to existing job storage files instead of copying content
    const completedResults = batchResults.results.filter(r => r.state === 'completed' && r.result);
    console.log(`Linking ${completedResults.length} completed results for corpus ${corpusId}`);
    
    const documents = completedResults.map(r => {
      // Link to the existing job data JSON via public URL
      const contentPath = `/jobs/${r.jobId}.json`;
      return {
        id: r.jobId,
        title: r.result.title || r.url,
        url: r.url,
        contentPath,
        size: 0 // size unknown; content stored within JSON file
      };
    });
    
    const { corpusController } = require('../controllers/corpus');
    const contents = {
      documents,
      images: []
    };

    try {
      const result = await corpusController.addContentFromMassScrape({
        params: { corpusId },
        body: { 
          batchId,
          contents
        }
      }, {
        json: (data: any) => data,
        status: () => ({ json: (data: any) => data })
      });

      return result.success;
    } catch (error) {
      console.error(`Failed to add batch results to corpus ${corpusId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const massScraperService = new MassScraperService();
