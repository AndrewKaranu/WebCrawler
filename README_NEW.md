# WebCrawler

A comprehensive desktop web scraping and content management application built with Node.js, Express, TypeScript, and Electron.

## Overview

WebCrawler is a full-featured desktop application that provides powerful web scraping capabilities with an intuitive interface. It combines multiple scraping engines, intelligent content management, and advanced site analysis tools in a single application.

### Key Capabilities

- **Multi-Engine Scraping**: Uses Playwright-based Spider Engine and local cache engine for flexible content extraction
- **Batch Processing**: Mass scraping with real-time job monitoring and queue management
- **Site Analysis**: Deep site mapping and structure analysis with the Dive tool
- **Content Management**: Organized content browsing, filtering, and corpus creation
- **Data Export**: Multiple export formats including JSON, CSV, and Markdown

## Installation & Setup

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/AndrewKaranu/WebCrawler.git
   cd WebCrawler
   npm install
   ```

2. **Run Development Mode**
   ```bash
   npm run dev
   ```
   This starts both the Express API server and Electron desktop app.

3. **Build for Production**
   ```bash
   npm run build
   cd app && npm run dist
   ```

## Application Features

### 1. Single URL Scraping

The Scrape tool provides targeted content extraction from individual web pages.

**How it works:**
- Select from available scraping engines (Spider Engine with Playwright, or Cache Engine)
- Configure scraping options: timeouts, screenshots, wait times, user agents
- Real-time execution with progress feedback
- Immediate results display with structured content data

**Use cases:**
- Quick content extraction from specific pages
- Testing scraping configurations
- Retrieving content with JavaScript rendering requirements

### 2. Mass Scraping System

The Mass Scraper enables batch processing of multiple URLs with advanced job management.

**Core functionality:**
- **Batch Creation**: Add multiple URLs manually or import from lists
- **Job Queue System**: Background processing with worker threads
- **Real-time Monitoring**: Live progress tracking, completion status, and error handling
- **Corpus Integration**: Automatically organize scraped content into searchable collections

**Workflow:**
1. Add URLs to batch (manual entry or bulk import)
2. Configure scraping options and corpus settings
3. Execute batch with real-time progress monitoring
4. Auto-link completed results to corpus for organization

### 3. Site Analysis (Dive Tool)

The Dive tool performs comprehensive website mapping and structure analysis.

**What it does:**
- **Complete Site Mapping**: Crawls entire websites to generate detailed sitemaps
- **Structure Analysis**: Identifies page hierarchies, internal/external links, and site statistics
- **Content Discovery**: Finds all accessible pages, assets, and resources
- **Export Options**: Generate sitemaps in JSON, CSV, or Markdown formats

**Generated data includes:**
- Page URLs, titles, and content types
- Link relationships and site depth analysis
- Load times and HTTP status codes
- Comprehensive site statistics and metrics

**Integration features:**
- Create mass scraping jobs directly from sitemap data
- Select specific pages for targeted scraping
- Export site analysis for external use

### 4. Content Browser

A powerful interface for managing and exploring all scraped content.

**Features:**
- **Advanced Filtering**: Search by content, domain, status codes, and custom criteria
- **Content Preview**: View scraped content with syntax highlighting and formatting
- **Batch Operations**: Export, delete, or organize multiple items
- **Cache Analytics**: Performance statistics and storage usage metrics

**Organization tools:**
- Sort by date, title, load time, or content size
- Domain-based grouping and filtering
- Full-text search across all content
- Individual content export and management

### 5. Corpus Management

Organize scraped content into structured, searchable collections.

**Core concepts:**
- **Corpus Creation**: Group related content for analysis and research
- **Auto-linking**: Automatically connect mass scraping results to corpora
- **Metadata Management**: Add descriptions, tags, and organizational information
- **Content Analysis**: Browse and analyze corpus contents with filtering tools

**Workflows:**
- Manual corpus creation with custom metadata
- Automatic corpus population from batch scraping jobs
- Content organization and tagging systems
- Export corpus data for external analysis

## Technical Architecture

### Backend (Express API)
- **Modular Design**: Separate controllers for scraping, content, corpus, and cache management
- **Engine System**: Pluggable scraping engines with factory pattern
- **Job Processing**: Queue-based background job system with worker threads
- **Persistent Storage**: File-based JSON storage for jobs, content, and corpus data
- **RESTful API**: Comprehensive endpoints for all application functions

### Frontend (Electron + React)
- **Multi-tab Interface**: Organized tool navigation with distinct functional areas
- **Real-time Updates**: Live progress monitoring and status updates
- **Material-UI Components**: Modern, responsive interface design
- **Local API Integration**: Seamless communication with embedded Express server

### Data Management
- **Content Caching**: Intelligent storage and retrieval of scraped data
- **Corpus System**: Structured organization of content collections
- **Export System**: Multiple format support (JSON, CSV, Markdown)
- **Analytics**: Performance monitoring and usage statistics

## API Reference

### Core Scraping Endpoints
```
POST /api/scrape                     - Single URL scraping with engine selection
POST /api/mass-scrape               - Create mass scraping batch jobs
GET  /api/mass-scrape               - List active batch jobs with status
POST /api/mass-scrape/from-dive     - Create batch from sitemap URLs
DELETE /api/mass-scrape/:batchId    - Cancel or delete batch job
```

### Site Analysis Endpoints
```
POST /api/dive                      - Generate comprehensive site maps
GET  /api/dive/sitemaps             - List all generated sitemaps
GET  /api/dive/sitemaps/:id         - Get detailed sitemap data
DELETE /api/dive/sitemaps/:id       - Delete sitemap and associated data
```

### Content Management Endpoints
```
GET  /api/content                   - Browse cached content with filtering
GET  /api/content/:id               - Get specific content entry
DELETE /api/content/:id             - Remove content from cache
POST /api/content/export            - Export content as JSON
```

### Corpus Management Endpoints
```
GET  /api/corpus                    - List all corpora with metadata
POST /api/corpus                    - Create new corpus
GET  /api/corpus/:id                - Get corpus details and content
POST /api/corpus/from-batch/:id     - Link batch results to corpus
DELETE /api/corpus/:id              - Delete corpus and references
```

### System & Analytics Endpoints
```
GET  /api/cache/stats               - Cache performance statistics
DELETE /api/cache/clear-all         - Clear all cached content
GET  /api/engines                   - List available scraping engines
GET  /api/jobs                      - List background jobs
DELETE /api/jobs/:jobId             - Cancel background job
```

## Development


```

### Development Commands
```bash
# Start development environment
npm run dev              # Both API and Electron app
npm run dev:api          # API server only
npm run dev:app          # Electron app only

# Build for production
npm run build            # Build both projects
npm run build:api        # API only
npm run build:app        # Electron app only

# Package for distribution
cd app && npm run dist   # Create distributable package
```

### Technology Stack
- **Backend**: Node.js, Express, TypeScript, Playwright
- **Frontend**: Electron, React, TypeScript, Material-UI
- **Storage**: File-based JSON persistence
- **Build**: Vite, npm workspaces, Electron Builder

## Known Issues & Limitations

- **Document Parsing**: Some corpus content population may have parsing issues with certain document types
- **Memory Usage**: Large batch jobs may require memory optimization for better performance
- **Error Recovery**: Some edge cases in scraping operations need improved error handling
- **Cache Performance**: Large datasets could benefit from database-based storage optimization

## Future Enhancements

- **HTTP Engine**: Lightweight scraping option for simple content extraction
- **Search Integration**: Direct search engine result scraping and analysis
- **Advanced Selectors**: Custom CSS/XPath selector-based data extraction
- **Scheduling**: Automated scraping with configurable intervals
- **Cloud Sync**: Optional cloud storage and synchronization features
- **Plugin System**: Extensible architecture for custom scraping engines

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes with proper TypeScript types and error handling
4. Test both API and UI functionality
5. Commit changes: `git commit -m 'Add your feature'`
6. Push to branch: `git push origin feature/your-feature`
7. Create a Pull Request

### Development Guidelines
- Follow TypeScript best practices and maintain type safety
- Use the established modular architecture patterns
- Add comprehensive error handling and user feedback
- Update API documentation for new endpoints
- Test both single operations and batch processing scenarios

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions, visit the [GitHub repository](https://github.com/AndrewKaranu/WebCrawler).
