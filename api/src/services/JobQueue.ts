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
    return this.jobs.get(jobId) || null;
  }

  // Update job progress
  async updateProgress(jobId: string, progress: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.updatedAt = new Date();
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
    return this.jobs.delete(jobId);
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
      } catch (error) {
        waitingJob.state = 'failed';
        waitingJob.error = error instanceof Error ? error.message : 'Unknown error';
        waitingJob.updatedAt = new Date();
        console.error(`Job ${waitingJob.id} failed:`, error);
      }
    }

    this.isProcessing = false;
  }
}

// Export singleton instance
export const jobQueue = new JobQueue();
