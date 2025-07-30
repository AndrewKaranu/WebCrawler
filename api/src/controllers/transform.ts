import { Request, Response } from 'express';

export const transformController = {
  async htmlToMarkdown(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'HTML to Markdown transform - Coming soon!' });
  },

  async extractData(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Data extraction - Coming soon!' });
  }
};
