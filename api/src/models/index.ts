import { z } from 'zod';

// Base scraping options
export const ScrapeOptionsSchema = z.object({
  url: z.string().url(),
  engine: z.enum(['spider', 'playwright', 'selenium', 'http', 'cache']).default('spider'),
  waitFor: z.number().min(0).max(30000).optional(),
  timeout: z.number().min(1000).max(120000).default(30000),
  headers: z.record(z.string()).optional(),
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string().optional(),
    path: z.string().optional(),
  })).optional(),
  screenshot: z.boolean().default(false),
  fullPage: z.boolean().default(false),
  userAgent: z.string().optional(),
  viewport: z.object({
    width: z.number().min(320).max(3840),
    height: z.number().min(240).max(2160),
  }).optional(),
  actions: z.array(z.object({
    type: z.enum(['click', 'type', 'scroll', 'wait', 'hover']),
    selector: z.string().optional(),
    value: z.string().optional(),
    delay: z.number().optional(),
  })).optional(),
});

export type ScrapeOptions = z.infer<typeof ScrapeOptionsSchema>;

// Crawl options
export const CrawlOptionsSchema = ScrapeOptionsSchema.extend({
  maxPages: z.number().min(1).max(10000).default(100),
  maxDepth: z.number().min(1).max(10).default(3),
  sameDomain: z.boolean().default(true),
  followRobots: z.boolean().default(true),
  delay: z.number().min(0).max(10000).default(1000),
  concurrent: z.number().min(1).max(10).default(3),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
});

export type CrawlOptions = z.infer<typeof CrawlOptionsSchema>;

// Engine result interface
export interface EngineResult {
  url: string;
  html: string;
  text: string;
  title: string;
  meta: Record<string, string>;
  links: Array<{
    href: string;
    text: string;
    title?: string;
  }>;
  images: Array<{
    src: string;
    alt?: string;
    title?: string;
  }>;
  screenshot?: string; // base64 encoded
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
  loadTime: number;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: Date;
}

// Job status and management
export interface Job {
  id: string;
  type: 'scrape' | 'crawl' | 'map' | 'search';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  options: ScrapeOptions | CrawlOptions;
  results: EngineResult[];
  errors: Array<{
    url: string;
    error: string;
    timestamp: Date;
  }>;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

// Search and extraction
export const SearchOptionsSchema = z.object({
  query: z.string().min(1),
  searchEngine: z.enum(['google', 'bing', 'duckduckgo']).default('google'),
  maxResults: z.number().min(1).max(100).default(10),
  scrapeResults: z.boolean().default(false),
  scrapeOptions: ScrapeOptionsSchema.optional(),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

// Data extraction
export const ExtractionSchema = z.object({
  selector: z.string(),
  attribute: z.string().optional(),
  multiple: z.boolean().default(false),
  required: z.boolean().default(false),
  transform: z.enum(['text', 'html', 'url', 'number', 'date']).optional(),
});

export const ExtractionOptionsSchema = z.object({
  url: z.string().url(),
  extractions: z.record(ExtractionSchema),
  scrapeOptions: ScrapeOptionsSchema.optional(),
});

export type ExtractionOptions = z.infer<typeof ExtractionOptionsSchema>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface BatchScrapeRequest {
  urls: string[];
  options: ScrapeOptions;
}

// Site mapping
export interface SiteMapNode {
  url: string;
  title: string;
  depth: number;
  parent?: string;
  children: string[];
  lastCrawled?: Date;
  statusCode: number;
  contentType?: string;
  size?: number;
}

export interface SiteMap {
  domain: string;
  rootUrl: string;
  nodes: Map<string, SiteMapNode>;
  totalPages: number;
  maxDepth: number;
  createdAt: Date;
  lastUpdated: Date;
}
