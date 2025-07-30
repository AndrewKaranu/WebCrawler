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

## Features (Planned)

- 🕷️ **Multiple Scraping Engines**
  - Playwright (JavaScript-enabled, stealth)
  - Selenium WebDriver (JavaScript-enabled)
  - HTTP Client (fast, lightweight)
  - Cache Engine (local storage)

- 🚀 **Advanced Scraping Capabilities**
  - Single URL scraping
  - Batch URL processing
  - Site crawling with depth control
  - Site mapping and structure analysis
  - Search engine integration
  - Data extraction with selectors

- 🖥️ **Desktop Application**
  - Native desktop experience
  - Local API server (no cloud dependency)
  - Job management and monitoring
  - Results viewer and export
  - Configuration management

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

## API Endpoints

### Scraping
- `POST /api/scrape` - Scrape a single URL
- `POST /api/scrape/batch` - Scrape multiple URLs

### Crawling
- `POST /api/crawl` - Start a crawl job
- `GET /api/crawl/:jobId/status` - Get crawl status
- `DELETE /api/crawl/:jobId` - Cancel crawl

### Site Mapping
- `POST /api/map` - Map site structure
- `GET /api/map/:jobId/status` - Get mapping status

### Search
- `POST /api/search` - Search and scrape results
- `POST /api/search/extract` - Extract data from search results

### Data Transformation
- `POST /api/transform/html-to-markdown` - Convert HTML to Markdown
- `POST /api/transform/extract-data` - Extract structured data

### Job Management
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:jobId` - Get job details
- `DELETE /api/jobs/:jobId` - Delete job

### Engine Management
- `GET /api/engines` - List available engines

## Development Roadmap

### Phase 1: Core Setup ✅
- [x] Project structure
- [x] TypeScript configuration
- [x] Basic API server
- [x] Electron app shell
- [x] Basic routing and components

### Phase 2: Engine Implementation 🚧
- [ ] HTTP Engine implementation
- [ ] Playwright Engine implementation  
- [ ] Selenium Engine implementation
- [ ] Cache Engine implementation
- [ ] Engine factory and management

### Phase 3: Core Features 📋
- [ ] Single URL scraping
- [ ] Batch scraping
- [ ] Job management system
- [ ] Results storage and retrieval
- [ ] Basic UI forms and viewers

### Phase 4: Advanced Features 📋
- [ ] Site crawling
- [ ] Site mapping
- [ ] Search integration
- [ ] Data extraction tools
- [ ] Export functionality

### Phase 5: Polish & Distribution 📋
- [ ] Error handling and logging
- [ ] Performance optimization
- [ ] User settings and preferences
- [ ] Application packaging
- [ ] Documentation and guides

## Technology Stack

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Playwright** - Browser automation
- **Selenium** - WebDriver automation
- **Axios** - HTTP client
- **Cheerio** - HTML parsing
- **Zod** - Schema validation

### Frontend
- **Electron** - Desktop framework
- **React** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Router** - Navigation
- **Vite** - Build tool

### Development Tools
- **npm workspaces** - Monorepo management
- **TSX** - TypeScript execution
- **Concurrently** - Parallel script execution
- **Electron Builder** - App packaging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/AndrewKaranu/WebCrawler).
