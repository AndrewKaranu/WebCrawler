# WebCrawler

A powerful desktop web scraper built with Node.js, Express, TypeScript, and Electron.

## Project Structure

This project uses a monorepo structure with two main workspaces:

- **`api/`** - Express backend API for web scraping operations
- **`app/`** - Electron desktop application with React UI

## Architecture

### Backend API (`api/`)
- **Express.js** server with TypeScript
- **Multiple scraping engines**: Playwright, Selenium, HTTP client, and cache
- **Modular architecture** with controllers, services, and models
- **RESTful API** endpoints for scraping operations

### Frontend App (`app/`)
- **Electron** desktop application
- **React** with TypeScript for the UI
- **Material-UI** for component library
- **Integrated API** - Electron manages the Express backend internally

## Features

- 🕷️ **Multiple Scraping Engines**
  - ✅ Spider Engine (JavaScript-enabled with Playwright)
  - ✅ Cache Engine (local storage and retrieval)
  - ✅ Engine factory pattern for extensibility
  - 🚧 HTTP Client (lightweight scraping)

- 🚀 **Advanced Scraping Capabilities**
  - ✅ Single URL scraping with multiple engines
  - ✅ Mass scraping with batch job management
  - ✅ Site crawling and sitemap generation
  - ✅ Dive tool for deep site structure analysis
  - ✅ Content caching and persistence
  - ✅ Job queue system with worker processing
  - 🚧 Search engine integration
  - 🚧 Advanced data extraction with selectors

- � **Content Management & Analysis**
  - ✅ Content browser with filtering and search
  - ✅ Corpus creation and management
  - ✅ Batch-to-corpus linking
  - ✅ Content persistence and export
  - ✅ Cache analytics and statistics
  - ✅ Sitemap visualization and export (JSON, CSV, Markdown)

- �🖥️ **Desktop Application**
  - ✅ Native desktop experience with Electron
  - ✅ Local API server (no cloud dependency)
  - ✅ Real-time job monitoring and progress tracking
  - ✅ Interactive content browser and corpus manager
  - ✅ Results viewer with preview and export
  - ✅ Multi-tab interface for different tools

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AndrewKaranu/WebCrawler.git
cd WebCrawler
```

2. Install dependencies:
```bash
npm install
```

This will install dependencies for both the API and app workspaces.

### Development

Run both the API and Electron app in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - API Server
npm run dev:api

# Terminal 2 - Electron App  
npm run dev:app
```

### Building

Build both projects:

```bash
npm run build
```

Or build separately:

```bash
# Build API only
npm run build:api

# Build App only  
npm run build:app
```

### Packaging

Package the Electron app for distribution:

```bash
cd app
npm run dist
```

## Application Overview

The WebCrawler desktop application provides a comprehensive interface for web scraping and content management:

### Main Interface
- **Scrape Tool**: Single URL scraping with engine selection and options
- **Mass Scraper**: Batch URL processing with job monitoring
- **Dive Tool**: Site mapping and structure analysis
- **Content Browser**: Browse, search, and manage scraped content
- **Corpus Manager**: Organize content into searchable corpora

### Key Workflows

#### Single Page Scraping
1. Navigate to the Scrape tab
2. Enter target URL and select scraping engine
3. Configure options (screenshots, wait times, etc.)
4. Execute scrape and view results

#### Mass Scraping
1. Use Mass Scraper tab to add multiple URLs
2. Configure batch options and corpus creation
3. Monitor progress in real-time
4. Auto-link completed batches to corpora

#### Site Analysis
1. Use Dive tool to map entire websites
2. View site structure, statistics, and page details
3. Export sitemaps in multiple formats
4. Create mass scrape jobs from sitemap URLs

#### Content Management
1. Browse all scraped content in Content Browser
2. Filter by domain, status, or search terms
3. Preview content and export individual entries
4. Organize content into corpora for analysis

## API Endpoints

### Core Scraping
- `POST /api/scrape` - Scrape a single URL with engine selection
- `POST /api/mass-scrape` - Create mass scraping batch jobs
- `GET /api/mass-scrape` - List active batch jobs
- `POST /api/mass-scrape/from-dive` - Create batch from sitemap URLs
- `DELETE /api/mass-scrape/:batchId` - Cancel/delete batch job

### Site Analysis
- `POST /api/dive` - Generate comprehensive site maps
- `GET /api/dive/sitemaps` - List all generated sitemaps
- `GET /api/dive/sitemaps/:id` - Get detailed sitemap data
- `DELETE /api/dive/sitemaps/:id` - Delete sitemap

### Content Management
- `GET /api/content` - Browse cached content with filtering
- `GET /api/content/:id` - Get specific content entry
- `DELETE /api/content/:id` - Remove content from cache
- `POST /api/content/export` - Export content as JSON

### Corpus Management
- `GET /api/corpus` - List all corpora
- `POST /api/corpus` - Create new corpus
- `GET /api/corpus/:id` - Get corpus details and content
- `POST /api/corpus/from-batch/:batchId` - Link batch results to corpus
- `DELETE /api/corpus/:id` - Delete corpus

### Cache & Analytics
- `GET /api/cache/stats` - Get cache performance statistics
- `DELETE /api/cache/clear-all` - Clear all cached content
- `GET /api/engines` - List available scraping engines

### Job Management
- `GET /api/jobs` - List all background jobs
- `GET /api/jobs/:jobId` - Get job status and progress
- `DELETE /api/jobs/:jobId` - Cancel job

## Development Roadmap

### Phase 1: Core Setup ✅
- [x] Project structure and TypeScript configuration
- [x] Express API server with modular architecture
- [x] Electron app shell with React UI
- [x] Material-UI integration and routing
- [x] Workspace-based monorepo structure

### Phase 2: Engine Implementation ✅
- [x] Spider Engine with Playwright integration
- [x] Cache Engine for local storage
- [x] Engine factory pattern and management
- [x] Persistent storage system
- [x] Job queue and worker system

### Phase 3: Core Features ✅
- [x] Single URL scraping with engine selection
- [x] Mass scraping with batch management
- [x] Real-time job monitoring and progress tracking
- [x] Content persistence and retrieval
- [x] Basic UI forms and result viewers

### Phase 4: Advanced Features ✅
- [x] Site mapping and structure analysis (Dive tool)
- [x] Content browser with search and filtering
- [x] Corpus creation and management system
- [x] Batch-to-corpus linking automation
- [x] Export functionality (JSON, CSV, Markdown)
- [x] Cache analytics and statistics

### Phase 5: Polish & Distribution �
- [x] Multi-tab desktop interface
- [x] Error handling and user feedback
- [ ] Performance optimization and memory management
- [ ] User settings and configuration persistence
- [ ] Application packaging and distribution
- [ ] Comprehensive documentation and user guides

### Phase 6: Future Enhancements 📋
- [ ] Search engine integration
- [ ] Advanced data extraction with custom selectors
- [ ] Scheduled scraping and automation
- [ ] Data visualization and reporting
- [ ] Plugin system for custom engines
- [ ] Cloud synchronization options

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework with TypeScript
- **Playwright** - Browser automation for Spider Engine
- **File-based storage** - JSON persistence for jobs and corpora
- **Queue system** - Background job processing
- **Modular architecture** - Controllers, services, and models

### Frontend
- **Electron** - Cross-platform desktop framework
- **React** - UI library with TypeScript
- **Material-UI (MUI)** - Modern component library
- **Multi-tab interface** - Organized tool navigation
- **Real-time updates** - Live job monitoring and progress
- **Vite** - Fast build tool and development server

### Data Management
- **Content caching** - Persistent storage of scraped data
- **Corpus system** - Organized content collections
- **Export formats** - JSON, CSV, and Markdown support
- **Analytics** - Cache performance and usage statistics

### Development Tools
- **npm workspaces** - Monorepo management
- **TSX** - TypeScript execution
- **Concurrently** - Parallel script execution
- **Electron Builder** - App packaging

## Known Issues & Limitations

- **Document Parsing**: Content corpus population may have parsing issues with certain document types
- **Memory Usage**: Large batch jobs may require memory optimization
- **Error Handling**: Some edge cases in scraping may need improved error recovery
- **Performance**: Cache operations could be optimized for large datasets

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Test your changes with both API and UI
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain the modular architecture pattern
- Add proper error handling and logging
- Update API documentation for new endpoints
- Test both single and batch operations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/AndrewKaranu/WebCrawler).
