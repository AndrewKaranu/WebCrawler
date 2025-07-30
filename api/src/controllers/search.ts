import { Request, Response } from 'express';

export const searchController = {
  async search(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Search endpoint - Coming soon!' });
  },

  async extractFromResults(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Extract from search results - Coming soon!' });
  }
};
