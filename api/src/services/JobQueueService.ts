import { jobQueue, Job } from './JobQueue';

// Enqueue a job, return job ID
export async function enqueueJob(name: string, data: any, opts?: { jobId?: string }): Promise<Job> {
  const job = await jobQueue.add(name, data, opts);
  return job;
}

// Retrieve job status and progress
export async function getJobStatus(jobId: string) {
  const job = await jobQueue.getJob(jobId);
  if (!job) return null;
  
  return { 
    id: job.id, 
    name: job.name, 
    state: job.state, 
    progress: job.progress, 
    result: job.result, 
    failedReason: job.error 
  };
}

// Export the queue for controller use
export { jobQueue };
