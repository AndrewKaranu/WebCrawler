import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { CORPUS_BASE_DIR, listDataFiles, loadData, saveData, deleteData } from '../services/PersistentStorage';

// Types
interface Corpus {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  sourceId: string;
  sourceType: 'mass-scrape' | 'dive' | 'mixed';
  tags: string[];
  statistics: {
    totalDocuments: number;
    totalImages: number;
    totalLinks: number;
    totalSize: number;
  };
  contents: {
    documents: Array<{ id: string; title: string; url: string; contentPath: string; size: number; }>;
    images: Array<{ id: string; url: string; imagePath: string; size: number; }>;
    sitemaps?: Array<{ id: string; url: string; mapPath: string; }>;
  };
}

// In-memory storage for development, loaded from disk on startup
const corpusStore: Record<string, Corpus> = {};

// Initialize corpus store from disk
export async function initCorpusStore(): Promise<void> {
  try {
    // List all corpus files
    const corpusIds = await listDataFiles(CORPUS_BASE_DIR);
    console.log(`Loading ${corpusIds.length} corpora from disk...`);
    
    for (const corpusId of corpusIds) {
      try {
        const corpus = await loadData<Corpus>(CORPUS_BASE_DIR, corpusId);
        if (corpus) {
          corpusStore[corpusId] = corpus;
        }
      } catch (error) {
        console.error(`Failed to load corpus ${corpusId}:`, error);
      }
    }
    
    console.log(`Loaded ${Object.keys(corpusStore).length} corpora from disk`);
  } catch (error) {
    console.error('Failed to initialize corpus store:', error);
  }
}

// Define metadata file path
const CORPUS_METADATA_FILE = path.join(CORPUS_BASE_DIR, 'metadata.json');

// Initialize corpus storage directory
async function initializeCorpusStorage() {
  try {
    // Load corpora is now handled by initCorpusStore
    // This is just kept for backward compatibility
    await fs.mkdir(CORPUS_BASE_DIR, { recursive: true });
    console.log(`Initialized corpus storage directory at ${CORPUS_BASE_DIR}`);
  } catch (err) {
    console.error('Error initializing corpus storage:', err);
  }
}

// Save corpus metadata to disk
async function saveCorpusMetadata() {
  try {
    // Save the full metadata file for backward compatibility
    await fs.writeFile(CORPUS_METADATA_FILE, JSON.stringify(corpusStore, null, 2));
    
    // Save each corpus as an individual file using the persistent storage system
    for (const [corpusId, corpus] of Object.entries(corpusStore)) {
      await saveData(CORPUS_BASE_DIR, corpusId, corpus);
    }
  } catch (err) {
    console.error('Error saving corpus metadata:', err);
  }
}

// Initialize on startup
initializeCorpusStorage();

export class CorpusController {
  /**
   * Create a new corpus
   */
  async createCorpus(req: Request, res: Response) {
    try {
      const { name, description, sourceId, sourceType, tags = [] } = req.body;

      if (!name || !sourceId || !sourceType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields (name, sourceId, sourceType)',
          timestamp: new Date()
        });
      }

      // Validate source type
      if (!['mass-scrape', 'dive', 'mixed'].includes(sourceType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid sourceType. Must be "mass-scrape", "dive", or "mixed"',
          timestamp: new Date()
        });
      }

      const id = uuidv4();
      const timestamp = new Date();

      const corpus: Corpus = {
        id,
        name,
        description: description || '',
        createdAt: timestamp,
        updatedAt: timestamp,
        sourceId,
        sourceType,
        tags,
        statistics: {
          totalDocuments: 0,
          totalImages: 0,
          totalLinks: 0,
          totalSize: 0
        },
        contents: {
          documents: [],
          images: [],
          sitemaps: []
        }
      };

      // Create directory for corpus content
      const corpusDir = path.join(CORPUS_BASE_DIR, id);
      await fs.mkdir(corpusDir, { recursive: true });

      corpusStore[id] = corpus;
      
      // Save metadata to disk
      await saveCorpusMetadata();

      return res.json({
        success: true,
        data: corpus,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Create corpus error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get all corpuses
   */
  async getAllCorpuses(req: Request, res: Response) {
    try {
      const corpuses = Object.values(corpusStore);
      
      return res.json({
        success: true,
        data: corpuses,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get all corpuses error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get a corpus by ID
   */
  async getCorpusById(req: Request, res: Response) {
    try {
      const { corpusId } = req.params;

      if (!corpusId) {
        return res.status(400).json({
          success: false,
          error: 'Corpus ID is required',
          timestamp: new Date()
        });
      }

      const corpus = corpusStore[corpusId];

      if (!corpus) {
        return res.status(404).json({
          success: false,
          error: 'Corpus not found',
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        data: corpus,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get corpus by ID error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Add content to a corpus from a mass scrape job
   */
  async addContentFromMassScrape(req: Request, res: Response) {
    try {
      const { corpusId } = req.params;
      const { batchId, contents } = req.body;

      if (!corpusId || !batchId || !contents) {
        return res.status(400).json({
          success: false,
          error: 'Corpus ID, batch ID, and contents are required',
          timestamp: new Date()
        });
      }

      const corpus = corpusStore[corpusId];

      if (!corpus) {
        return res.status(404).json({
          success: false,
          error: 'Corpus not found',
          timestamp: new Date()
        });
      }

      // Process documents
      if (contents.documents && Array.isArray(contents.documents)) {
        console.log(`Adding ${contents.documents.length} documents to corpus ${corpusId}`);
        
        for (const doc of contents.documents) {
          if (!doc.id || !doc.title || !doc.url) {
            console.log(`Skipping document with missing required fields: ${JSON.stringify(doc)}`);
            continue;
          }

          // Check if content path exists
          const contentPath = doc.contentPath || '';
          let size = doc.size || 0;
          
          // Validate content path
          try {
            if (contentPath) {
              const fs = require('fs/promises');
              const stats = await fs.stat(contentPath);
              size = stats.size;
              console.log(`Verified content file at ${contentPath}, size: ${size} bytes`);
            }
          } catch (error) {
            const err = error as Error;
            console.warn(`Content file not found at ${contentPath}: ${err.message}`);
            // Continue anyway, we'll just store the reference
          }

          // Ensure document isn't already in the corpus
          if (!corpus.contents.documents.some(d => d.id === doc.id)) {
            corpus.contents.documents.push({
              id: doc.id,
              title: doc.title,
              url: doc.url,
              contentPath: contentPath,
              size: size
            });
            
            corpus.statistics.totalDocuments++;
            corpus.statistics.totalSize += size;
            
            console.log(`Added document ${doc.id} to corpus ${corpusId}`);
          } else {
            console.log(`Document ${doc.id} already exists in corpus ${corpusId}`);
          }
        }
      }

      // Process images
      if (contents.images && Array.isArray(contents.images)) {
        for (const img of contents.images) {
          if (!img.id || !img.url || !img.imagePath || !img.size) continue;

          // Ensure image isn't already in the corpus
          if (!corpus.contents.images.some(i => i.id === img.id)) {
            corpus.contents.images.push({
              id: img.id,
              url: img.url,
              imagePath: img.imagePath,
              size: img.size
            });
            
            corpus.statistics.totalImages++;
            corpus.statistics.totalSize += img.size;
          }
        }
      }

      // Update corpus metadata
      corpus.updatedAt = new Date();
      corpus.statistics.totalLinks = corpus.contents.documents.length + corpus.contents.images.length;

      // Save metadata to disk
      await saveCorpusMetadata();

      return res.json({
        success: true,
        data: {
          corpus: corpusId,
          documentsAdded: contents.documents?.length || 0,
          imagesAdded: contents.images?.length || 0
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Add content to corpus error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Add sitemap from a dive to a corpus
   */
  async addSitemapFromDive(req: Request, res: Response) {
    try {
      const { corpusId } = req.params;
      const { diveId, sitemap } = req.body;

      if (!corpusId || !diveId || !sitemap) {
        return res.status(400).json({
          success: false,
          error: 'Corpus ID, dive ID, and sitemap are required',
          timestamp: new Date()
        });
      }

      const corpus = corpusStore[corpusId];

      if (!corpus) {
        return res.status(404).json({
          success: false,
          error: 'Corpus not found',
          timestamp: new Date()
        });
      }

      // Initialize sitemaps array if it doesn't exist
      if (!corpus.contents.sitemaps) {
        corpus.contents.sitemaps = [];
      }

      // Add sitemap to corpus
      const sitemapId = uuidv4();
      const sitemapFilename = `sitemap-${diveId}.json`;
      const sitemapPath = path.join(CORPUS_BASE_DIR, corpusId, sitemapFilename);

      // Write sitemap to file
      await fs.writeFile(sitemapPath, JSON.stringify(sitemap, null, 2));

      // Add sitemap reference to corpus
      corpus.contents.sitemaps.push({
        id: sitemapId,
        url: sitemap.startUrl || diveId,
        mapPath: sitemapPath
      });

      // Update corpus metadata
      corpus.updatedAt = new Date();
      
      // Save metadata to disk
      await saveCorpusMetadata();

      return res.json({
        success: true,
        data: {
          corpus: corpusId,
          sitemapAdded: sitemapId
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Add sitemap to corpus error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Export a corpus
   */
  async exportCorpus(req: Request, res: Response) {
    try {
      const { corpusId } = req.params;
      const { format = 'json' } = req.body;

      if (!corpusId) {
        return res.status(400).json({
          success: false,
          error: 'Corpus ID is required',
          timestamp: new Date()
        });
      }

      const corpus = corpusStore[corpusId];

      if (!corpus) {
        return res.status(404).json({
          success: false,
          error: 'Corpus not found',
          timestamp: new Date()
        });
      }

      // Export corpus based on format
      let exportData;
      
      if (format === 'json') {
        // For JSON, we'll include metadata and content references
        exportData = JSON.stringify(corpus, null, 2);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="corpus-${corpusId}.json"`);
      } else if (format === 'csv') {
        // For CSV, we'll create a simple format for documents
        const header = 'ID,Title,URL,Size\n';
        const rows = corpus.contents.documents.map(doc => 
          `"${doc.id}","${doc.title}","${doc.url}",${doc.size}`
        ).join('\n');
        
        exportData = header + rows;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="corpus-${corpusId}.csv"`);
      } else if (format === 'full') {
        // This would be for a full archive with all content
        // For now, we'll just return an error
        return res.status(400).json({
          success: false,
          error: 'Full corpus export not yet implemented',
          timestamp: new Date()
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid export format. Supported formats: json, csv, full',
          timestamp: new Date()
        });
      }

      return res.send(exportData);
    } catch (error) {
      console.error('Export corpus error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Delete a corpus
   */
  async deleteCorpus(req: Request, res: Response) {
    try {
      const { corpusId } = req.params;

      if (!corpusId) {
        return res.status(400).json({
          success: false,
          error: 'Corpus ID is required',
          timestamp: new Date()
        });
      }

      const corpus = corpusStore[corpusId];

      if (!corpus) {
        return res.status(404).json({
          success: false,
          error: 'Corpus not found',
          timestamp: new Date()
        });
      }

      // Delete corpus directory
      try {
        const corpusDir = path.join(CORPUS_BASE_DIR, corpusId);
        await fs.rm(corpusDir, { recursive: true, force: true });
        
        // Remove from persistent storage
        await deleteData(CORPUS_BASE_DIR, corpusId);
      } catch (err) {
        console.error('Error deleting corpus directory:', err);
      }

      // Remove from store
      delete corpusStore[corpusId];
      
      // Save updated metadata
      await saveCorpusMetadata();

      return res.json({
        success: true,
        data: { id: corpusId, deleted: true },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Delete corpus error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get corpus statistics
   */
  async getCorpusStatistics(req: Request, res: Response) {
    try {
      const { corpusId } = req.params;

      if (!corpusId) {
        return res.status(400).json({
          success: false,
          error: 'Corpus ID is required',
          timestamp: new Date()
        });
      }

      const corpus = corpusStore[corpusId];

      if (!corpus) {
        return res.status(404).json({
          success: false,
          error: 'Corpus not found',
          timestamp: new Date()
        });
      }

      // Calculate additional statistics
      const contentTypes = new Set(corpus.contents.documents.map(doc => {
        const ext = path.extname(doc.url).toLowerCase();
        return ext || 'unknown';
      }));

      const extendedStats = {
        ...corpus.statistics,
        contentTypes: Array.from(contentTypes),
        averageDocSize: corpus.statistics.totalDocuments > 0 
          ? Math.round(corpus.statistics.totalSize / corpus.statistics.totalDocuments) 
          : 0,
        siteMaps: corpus.contents.sitemaps?.length || 0
      };

      return res.json({
        success: true,
        data: extendedStats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get corpus statistics error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Create a corpus from an existing mass scrape job
   */
  async createCorpusFromMassScrape(req: Request, res: Response) {
    try {
      const { batchId, name, description, tags = [] } = req.body;

      if (!batchId || !name) {
        return res.status(400).json({
          success: false,
          error: 'Batch ID and name are required',
          timestamp: new Date()
        });
      }

      // TODO: Fetch the mass scrape job data from the mass scraper controller
      // For now, we'll just create an empty corpus
      
      const id = uuidv4();
      const timestamp = new Date();

      const corpus: Corpus = {
        id,
        name,
        description: description || `Corpus from mass scrape job: ${batchId}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        sourceId: batchId,
        sourceType: 'mass-scrape',
        tags,
        statistics: {
          totalDocuments: 0,
          totalImages: 0,
          totalLinks: 0,
          totalSize: 0
        },
        contents: {
          documents: [],
          images: []
        }
      };

      // Create directory for corpus content
      const corpusDir = path.join(CORPUS_BASE_DIR, id);
      await fs.mkdir(corpusDir, { recursive: true });

      corpusStore[id] = corpus;

      return res.json({
        success: true,
        data: {
          corpus,
          message: 'Corpus created from mass scrape job. Contents will be populated asynchronously.'
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Create corpus from mass scrape error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Create a corpus from an existing dive job that led to a mass scrape
   */
  async createCorpusFromDive(req: Request, res: Response) {
    try {
      const { diveId, batchId, name, description, tags = [] } = req.body;

      if (!diveId || !name) {
        return res.status(400).json({
          success: false,
          error: 'Dive ID and name are required',
          timestamp: new Date()
        });
      }

      // TODO: Fetch the dive job and mass scrape data
      // For now, we'll just create an empty corpus
      
      const id = uuidv4();
      const timestamp = new Date();

      const corpus: Corpus = {
        id,
        name,
        description: description || `Corpus from dive job: ${diveId}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        sourceId: diveId,
        sourceType: batchId ? 'mixed' : 'dive',
        tags,
        statistics: {
          totalDocuments: 0,
          totalImages: 0,
          totalLinks: 0,
          totalSize: 0
        },
        contents: {
          documents: [],
          images: [],
          sitemaps: []
        }
      };

      // Create directory for corpus content
      const corpusDir = path.join(CORPUS_BASE_DIR, id);
      await fs.mkdir(corpusDir, { recursive: true });

      corpusStore[id] = corpus;

      return res.json({
        success: true,
        data: {
          corpus,
          message: 'Corpus created from dive job. Contents will be populated asynchronously.'
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Create corpus from dive error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }
}

export const corpusController = new CorpusController();
