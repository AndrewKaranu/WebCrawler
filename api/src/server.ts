import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { routes } from './routes';

// Import and start the simple job worker (no Redis required)
import './services/JobWorker';
import { initStorage } from './services/PersistentStorage';
import { jobQueue } from './services/JobQueue';
import { initCorpusStore } from './controllers/corpus';

const app = express();

// Initialize storage and load saved data
(async () => {
  try {
    // Initialize persistent storage
    await initStorage();
    
    // Initialize job queue from storage
    await jobQueue.initialize();
    
    // Initialize corpus store from storage
    await initCorpusStore();
    
    console.log('🚀 Persistent storage initialized successfully');
  } catch (error) {
    console.error('Failed to initialize persistent storage:', error);
  }
})();
const PORT = process.env['PORT'] || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration for Electron app
app.use(cors({
  origin: ['http://localhost:3000', 'file://', 'app://'],
  credentials: true,
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', routes);
// Serve job and corpus files statically
import path from 'path';
app.use('/jobs', express.static(path.join(process.cwd(), 'data', 'jobs')));
app.use('/corpus', express.static(path.join(process.cwd(), 'data', 'corpus')));

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WebCrawler API running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;
