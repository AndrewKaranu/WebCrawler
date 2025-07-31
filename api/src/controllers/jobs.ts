import { Request, Response } from 'express';
import { getJobStatus, jobQueue } from '../services/JobQueueService';

export const jobsController = {
  // List recent jobs (e.g. all waiting/active jobs)
  listJobs: async (req: Request, res: Response) => {
    const waiting = await jobQueue.getJobs(['waiting']);
    const active = await jobQueue.getJobs(['active']);
    const completed = await jobQueue.getJobs(['completed']);
    res.json({ success: true, data: { waiting, active, completed } });
  },
  
  // Get status of a specific job by ID
  getJob: async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    return res.json({ success: true, data: status });
  },
  
  // Remove a job (clean up)
  deleteJob: async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const success = await jobQueue.removeJob(jobId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    return res.json({ success: true, message: 'Job removed' });
  }
};
