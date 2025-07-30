import { Request, Response } from 'express';

export const crawlController = {
  async crawl(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Crawl endpoint - Coming soon!' });
  },

  async getStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    res.json({ success: true, jobId, status: 'pending' });
  },

  async cancelCrawl(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    res.json({ success: true, message: `Crawl ${jobId} cancelled` });
  }
};
