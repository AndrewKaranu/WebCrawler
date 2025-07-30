import { Request, Response } from 'express';

export const jobsController = {
  async listJobs(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [], message: 'Jobs list - Coming soon!' });
  },

  async getJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    res.json({ success: true, jobId, message: 'Get job details - Coming soon!' });
  },

  async deleteJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    res.json({ success: true, message: `Job ${jobId} deleted` });
  }
};
