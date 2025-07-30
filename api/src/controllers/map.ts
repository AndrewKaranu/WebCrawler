import { Request, Response } from 'express';

export const mapController = {
  async mapSite(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Site mapping endpoint - Coming soon!' });
  },

  async getMapStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    res.json({ success: true, jobId, status: 'pending' });
  }
};
