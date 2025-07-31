import * as path from 'path';
import { JOBS_DIR, saveData, loadData, listDataFiles, deleteData } from './PersistentStorage';

export interface Job {
  id: string;
  name: string;
  data: any;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress: any;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobWithProgress extends Job {
  updateProgress: (progress: any) => Promise<void>;
}

type JobProcessor = (job: JobWithProgress) => Promise<any>;

export class JobQueue {
  private jobs = new Map<string, Job>();
  private processors = new Map<string, JobProcessor>();
  private isProcessing = false;
  private idCounter = 1;
  
  // Initialize with saved jobs
  async initialize(): Promise<void> {
    try {
      // Load all saved jobs
      const jobIds = await listDataFiles(JOBS_DIR);
      console.log(`Loading ${jobIds.length} saved jobs...`);
      
      for (const jobId of jobIds) {
        const job = await loadData<Job>(JOBS_DIR, jobId);
        if (job) {
          // Only load completed or failed jobs, waiting/active jobs need to be restarted
          if (job.state === 'completed' || job.state === 'failed') {
            this.jobs.set(job.id, job);
            // Update counter to ensure new IDs don't clash
            const numericId = parseInt(job.id);
            if (!isNaN(numericId) && numericId >= this.idCounter) {
              this.idCounter = numericId + 1;
            }
          }
        }
      }
      
      console.log(`Loaded ${this.jobs.size} jobs from persistent storage`);
    } catch (error) {
      console.error('Error initializing job queue from storage:', error);
    }
  }

  // Add a job to the queue
  async add(name: string, data: any, opts?: { jobId?: string }): Promise<Job> {
    const job: Job = {
      id: opts?.jobId || (this.idCounter++).toString(),
      name,
      data,
      state: 'waiting',
      progress: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(job.id, job);
    
    // Persist job immediately
    await this.saveJob(job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processJobs();
    }

    return job;
  }

  // Register a processor for a job type
  process(jobName: string, processor: JobProcessor) {
    this.processors.set(jobName, processor);
  }

  // Get job by ID
  async getJob(jobId: string): Promise<Job | null> {
    const job = this.jobs.get(jobId);
    
    // If job not found in memory, try to load from disk
    if (!job) {
      const loadedJob = await loadData<Job>(JOBS_DIR, jobId);
      if (loadedJob) {
        this.jobs.set(jobId, loadedJob);
        return loadedJob;
      }
      return null;
    }
    
    return job;
  }

  // Update job progress
  async updateProgress(jobId: string, progress: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.updatedAt = new Date();
      
      // Persist job update
      await this.saveJob(job);
    }
  }

  // Get jobs by state
  async getJobs(states: string[]): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(job => 
      states.includes(job.state)
    );
  }

  // Remove job
  async removeJob(jobId: string): Promise<boolean> {
    const removed = this.jobs.delete(jobId);
    
    if (removed) {
      try {
        // Remove from persistent storage
        await deleteData(JOBS_DIR, jobId);
      } catch (error) {
        console.error(`Error deleting job ${jobId} from persistent storage:`, error);
      }
    }
    
    return removed;
  }
  
  // Save job to persistent storage
  private async saveJob(job: Job): Promise<void> {
    try {
      await saveData(JOBS_DIR, job.id, job);
    } catch (error) {
      console.error(`Error saving job ${job.id} to persistent storage:`, error);
    }
  }

  // Process jobs sequentially
  private async processJobs() {
    this.isProcessing = true;

    while (true) {
      // Find next waiting job
      const waitingJob = Array.from(this.jobs.values())
        .find(job => job.state === 'waiting');

      if (!waitingJob) {
        break; // No more waiting jobs
      }

      const processor = this.processors.get(waitingJob.name);
      if (!processor) {
        waitingJob.state = 'failed';
        waitingJob.error = `No processor found for job type: ${waitingJob.name}`;
        waitingJob.updatedAt = new Date();
        continue;
      }

      // Process the job
      waitingJob.state = 'active';
      waitingJob.updatedAt = new Date();
      await this.saveJob(waitingJob);

      try {
        // Create a job object with updateProgress method
        const jobWithProgress = {
          ...waitingJob,
          updateProgress: async (progress: any) => {
            await this.updateProgress(waitingJob.id, progress);
          }
        };

        const result = await processor(jobWithProgress);
        
        waitingJob.state = 'completed';
        waitingJob.result = result;
        waitingJob.updatedAt = new Date();
        await this.saveJob(waitingJob);
      } catch (error) {
        waitingJob.state = 'failed';
        waitingJob.error = error instanceof Error ? error.message : 'Unknown error';
        waitingJob.updatedAt = new Date();
        console.error(`Job ${waitingJob.id} failed:`, error);
        await this.saveJob(waitingJob);
      }
    }

    this.isProcessing = false;
  }
}

// Export singleton instance
export const jobQueue = new JobQueue();
