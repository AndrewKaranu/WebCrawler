import { Request, Response } from 'express';
import { massScraperService, MassScrapeRequest } from '../services/MassScraperService';

export const massScraperController = {
  /**
   * Create a mass scrape batch
   * POST /api/mass-scrape
   * 
   * Can optionally create an associated corpus if createCorpus is set to true
   */
  createBatch: async (req: Request, res: Response): Promise<void> => {
    try {
      const request: MassScrapeRequest = {
        urls: req.body.urls,
        batchName: req.body.batchName,
        options: req.body.options,
        createCorpus: req.body.createCorpus,
        corpusName: req.body.corpusName,
        corpusDescription: req.body.corpusDescription,
        corpusTags: req.body.corpusTags
      };

      // Validate request
      if (!request.urls || !Array.isArray(request.urls) || request.urls.length === 0) {
        res.status(400).json({
          success: false,
          error: 'URLs array is required and cannot be empty'
        });
        return;
      }

      const result = await massScraperService.createMassScrapeBatch(request);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating mass scrape batch:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get batch status and progress
   * GET /api/mass-scrape/:batchId
   */
  getBatchStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const batch = await massScraperService.getBatchStatus(batchId);

      if (!batch) {
        res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
        return;
      }

      res.json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error getting batch status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get all batches
   * GET /api/mass-scrape
   */
  getAllBatches: async (req: Request, res: Response) => {
    try {
      const batches = await massScraperService.getAllBatches();

      res.json({
        success: true,
        data: batches
      });
    } catch (error) {
      console.error('Error getting all batches:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get batch results
   * GET /api/mass-scrape/:batchId/results
   */
  getBatchResults: async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const batchResults = await massScraperService.getBatchResults(batchId);

      if (!batchResults) {
        res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
        return;
      }

      res.json({
        success: true,
        data: batchResults
      });
    } catch (error) {
      console.error('Error getting batch results:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Cancel a batch
   * DELETE /api/mass-scrape/:batchId/cancel
   */
  cancelBatch: async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const success = await massScraperService.cancelBatch(batchId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Batch not found or could not be cancelled'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Batch cancelled successfully'
      });
      return;
    } catch (error) {
      console.error('Error cancelling batch:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  },

  /**
   * Delete a batch
   * DELETE /api/mass-scrape/:batchId
   */
  deleteBatch: async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const success = await massScraperService.deleteBatch(batchId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Batch deleted successfully'
      });
      return;
    } catch (error) {
      console.error('Error deleting batch:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  },

  /**
   * Create batch from dive results (for future diver integration)
   * POST /api/mass-scrape/from-dive
   */
  createBatchFromDive: async (req: Request, res: Response): Promise<void> => {
    try {
      const { diveJobId, selectedUrls, batchName, options, createCorpus } = req.body;

      if (!diveJobId || !selectedUrls || !Array.isArray(selectedUrls)) {
        res.status(400).json({
          success: false,
          error: 'diveJobId and selectedUrls array are required'
        });
        return;
      }

      const result = await massScraperService.createBatchFromDiveResults(
        diveJobId,
        selectedUrls,
        batchName,
        options,
        createCorpus
      );

      res.json({
        success: true,
        data: result
      });
      return;
    } catch (error) {
      console.error('Error creating batch from dive:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  },

  /**
   * Create a corpus from an existing batch
   * POST /api/corpus/from-batch/:batchId
   */
  createCorpusFromBatch: async (req: Request, res: Response): Promise<void> => {
    console.log(`HTTP POST /api/corpus/from-batch/${req.params.batchId} called`);
    try {
      const { batchId } = req.params;
      const { corpusName, corpusDescription, corpusTags } = req.body;
      
      const corpusId = await massScraperService.createCorpusFromBatch(
        batchId, 
        corpusName,
        corpusDescription,
        corpusTags
      );
      
      if (!corpusId) {
        res.status(404).json({
          success: false,
          error: 'Batch not found or corpus creation failed'
        });
        return;
      }
      
      // Add batch results to the corpus
      const success = await massScraperService.addBatchResultsToCorpus(batchId, corpusId);
      
      res.json({
        success: true,
        data: { 
          corpusId,
          batchId,
          resultsAdded: success 
        },
        message: `Corpus created from batch ${batchId}`
      });
      return;
    } catch (error) {
      console.error('Error creating corpus from batch:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  },

  /**
   * Manually re-link batch results to an existing corpus
   * POST /api/corpus/:corpusId/relink/:batchId
   */
  relinkBatchToCorpus: async (req: Request, res: Response): Promise<void> => {
    console.log(`HTTP POST /api/corpus/${req.params.corpusId}/relink/${req.params.batchId} called`);
    try {
      const { corpusId, batchId } = req.params;
      
      const success = await massScraperService.addBatchResultsToCorpus(batchId, corpusId);
      
      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Failed to link batch results to corpus'
        });
        return;
      }
      
      res.json({
        success: true,
        data: { 
          corpusId,
          batchId,
          resultsAdded: success 
        },
        message: `Batch ${batchId} results linked to corpus ${corpusId}`
      });
      return;
    } catch (error) {
      console.error('Error linking batch to corpus:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }
};
