import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Tooltip,
  Pagination,
  Stack,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Switch,
  FormControlLabel,
  TableContainer
} from '@mui/material';
import {
  Storage,
  Refresh,
  ClearAll,
  Search,
  Download,
  Visibility,
  Delete,
  Language,
  Speed,
  Link,
  Image,
  Cached,
  Article,
  Analytics,
  Schedule,
  PlayArrow,
  FilterList
} from '@mui/icons-material';

interface CacheEntry {
  id: string;
  url: string;
  title: string;
  text: string;
  timestamp: Date;
  statusCode: number;
  loadTime: number;
  contentType: string;
  size: number;
  domain: string;
  linksCount: number;
  imagesCount: number;
  cached: boolean;
}

interface CacheStats {
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: string;
  timestamp: Date;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Interface for sitemap entries
interface SitemapEntry {
  id: string;
  domain: string;
  url: string;
  createdAt: Date;
  totalPages: number;
  maxDepth: number;
  crawled: number;
  engineUsed: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Interface for detailed sitemap data
interface DetailedSitemap {
  id: string;
  sitemap: {
    domain: string;
    startUrl: string;
    pages: Array<{
      url: string;
      title: string;
      depth: number;
      statusCode: number;
      contentType: string;
      links: Array<{
        url: string;
        text: string;
        type: string;
      }>;
      meta: Record<string, string>;
      size: number;
      loadTime: number;
      timestamp: Date;
    }>;
    totalPages: number;
    totalDepth: number;
    statistics: {
      internalLinks: number;
      externalLinks: number;
      assets: number;
      errors: number;
      averageLoadTime: number;
    };
    crawlTime: number;
    markdown?: string;
  };
  createdAt: Date;
  metadata?: {
    url?: string;
    engineUsed?: string;
  };
}

const ContentBrowser: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [contentEntries, setContentEntries] = useState<CacheEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CacheEntry[]>([]);
  const [sitemapEntries, setSitemapEntries] = useState<SitemapEntry[]>([]);
  const [filteredSitemaps, setFilteredSitemaps] = useState<SitemapEntry[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sitemapsLoading, setSitemapsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [sitemapError, setSitemapError] = useState<string>('');
  
  // Sitemap viewing
  const [sitemapDetail, setSitemapDetail] = useState<DetailedSitemap | null>(null);
  const [sitemapViewOpen, setSitemapViewOpen] = useState(false);
  const [loadingSitemapDetail, setLoadingSitemapDetail] = useState(false);
  const [sitemapDetailError, setSitemapDetailError] = useState<string>('');
  
  // Mass scrape functionality
  interface MassScrapeBatchOptions {
    bypassCache: boolean;
    saveResults: boolean;
    [key: string]: any;
  }

  const [massScrapingDialogOpen, setMassScrapingDialogOpen] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [massScrapeBatchName, setMassScrapeBatchName] = useState('');
  const [creatingMassScrapeJob, setCreatingMassScrapeJob] = useState(false);
  const [massScrapeError, setMassScrapeError] = useState<string>('');
  const [massScrapeOptions, setMassScrapeOptions] = useState<MassScrapeBatchOptions>({
    bypassCache: false,
    saveResults: true
  });
  
  // Corpus options for mass scrape
  const [createCorpus, setCreateCorpus] = useState(false);
  const [corpusName, setCorpusName] = useState('');
  const [corpusDescription, setCorpusDescription] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(12);
  // Slice filtered entries for current page
  const paginatedEntries = filteredEntries.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  
  // Dialog states
  const [selectedEntry, setSelectedEntry] = useState<CacheEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load cache stats and content on mount
  useEffect(() => {
    loadCacheStats();
    loadContentEntries();
    loadSitemapEntries();
  }, []);

  // Filter and sort entries when filters change
  useEffect(() => {
    let filtered = [...contentEntries];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Domain filter
    if (domainFilter !== 'all') {
      filtered = filtered.filter(entry => entry.domain === domainFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'success') {
        filtered = filtered.filter(entry => entry.statusCode >= 200 && entry.statusCode < 300);
      } else if (statusFilter === 'error') {
        filtered = filtered.filter(entry => entry.statusCode >= 400);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CacheEntry];
      let bValue: any = b[sortBy as keyof CacheEntry];
      
      if (sortBy === 'timestamp') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredEntries(filtered);
    setPage(1); // Reset to first page when filters change
  }, [contentEntries, searchTerm, domainFilter, statusFilter, sortBy, sortOrder]);

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/cache/stats');
      if (response.ok) {
        const data = await response.json();
        // Map API summary fields to component state
        const summary = data.data.summary;
        setCacheStats({
          totalKeys: summary.totalKeys,
          totalHits: summary.totalHits,
          totalMisses: summary.totalMisses,
          hitRate: summary.overallHitRate,
          memoryUsage: summary.combinedMemoryUsage,
          timestamp: new Date(summary.timestamp)
        });
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const loadContentEntries = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/content');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContentEntries(data.data.entries || []);
        } else {
          setError(data.error || 'Failed to load content');
        }
      } else {
        setError('Failed to fetch content from server');
      }
    } catch (error) {
      setError('Network error - please check if the API server is running');
      console.error('Error loading content entries:', error);
      
      // Fallback to mock data for development
      const mockEntries: CacheEntry[] = [
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example Website',
          text: 'This domain is for use in illustrative examples...',
          timestamp: new Date(),
          statusCode: 200,
          loadTime: 1245,
          contentType: 'text/html',
          size: 15432,
          domain: 'example.com',
          linksCount: 5,
          imagesCount: 2,
          cached: true,
        },
        {
          id: '2',
          url: 'https://github.com',
          title: 'GitHub',
          text: 'GitHub is where over 100 million developers...',
          timestamp: new Date(Date.now() - 3600000),
          statusCode: 200,
          loadTime: 892,
          contentType: 'text/html',
          size: 45123,
          domain: 'github.com',
          linksCount: 15,
          imagesCount: 8,
          cached: true,
        },
      ];
      setContentEntries(mockEntries);
    } finally {
      setLoading(false);
    }
  };

  const clearAllCache = async () => {
    try {
      const response = await fetch('/api/cache/clear-all', { method: 'DELETE' });
      if (response.ok) {
        setContentEntries([]);
        loadCacheStats();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const loadSitemapEntries = async () => {
    setSitemapsLoading(true);
    setSitemapError('');
    
    try {
      console.log('Fetching sitemaps from API...');
      const response = await fetch('http://localhost:3001/api/dive/sitemaps');
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sitemaps API response:', data);
        
        if (data.success) {
          const sitemaps = data.data.map((sitemap: any) => ({
            ...sitemap,
            createdAt: new Date(sitemap.createdAt)
          }));
          console.log('Processed sitemaps:', sitemaps);
          if (sitemaps && sitemaps.length > 0) {
            setSitemapEntries(sitemaps);
            setFilteredSitemaps(sitemaps);
          } else {
            console.log('No sitemaps returned from API');
            setSitemapEntries([]);
            setFilteredSitemaps([]);
          }
        } else {
          console.error('API returned error:', data.error);
          setSitemapError(data.error || 'Failed to load sitemaps');
        }
      } else {
        console.error('API request failed with status:', response.status);
        setSitemapError(`Failed to fetch sitemaps from server (Status: ${response.status})`);
      }
    } catch (error) {
      setSitemapError('Network error - please check if the API server is running');
      console.error('Error loading sitemaps:', error);
      
      // Mock data for development
      setSitemapEntries([
        {
          id: 'sitemap-1',
          domain: 'example.com',
          url: 'https://example.com',
          createdAt: new Date(),
          totalPages: 25,
          maxDepth: 3,
          crawled: 25,
          engineUsed: 'SpiderEngine'
        }
      ]);
      setFilteredSitemaps([
        {
          id: 'sitemap-1',
          domain: 'example.com',
          url: 'https://example.com',
          createdAt: new Date(),
          totalPages: 25,
          maxDepth: 3,
          crawled: 25,
          engineUsed: 'SpiderEngine'
        }
      ]);
    } finally {
      setSitemapsLoading(false);
    }
  };
  
  const viewSitemap = async (id: string) => {
    setLoadingSitemapDetail(true);
    setSitemapDetailError('');
    
    try {
      console.log(`Fetching sitemap details for ID: ${id}`);
      const response = await fetch(`http://localhost:3001/api/dive/sitemaps/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          // Process dates in the sitemap data
          const sitemap = data.data;
          
          // Convert string dates to Date objects
          if (sitemap.createdAt) {
            sitemap.createdAt = new Date(sitemap.createdAt);
          }
          
          if (sitemap.sitemap?.timestamp) {
            sitemap.sitemap.timestamp = new Date(sitemap.sitemap.timestamp);
          }
          
          if (sitemap.sitemap?.pages) {
            sitemap.sitemap.pages.forEach((page: any) => {
              if (page.timestamp) {
                page.timestamp = new Date(page.timestamp);
              }
            });
          }
          
          setSitemapDetail(sitemap);
          setSitemapViewOpen(true);
        } else {
          setSitemapDetailError(data.errors?.[0] || 'Failed to load sitemap details');
        }
      } else {
        setSitemapDetailError(`Failed to fetch sitemap details (Status: ${response.status})`);
      }
    } catch (error) {
      setSitemapDetailError('Network error while loading sitemap details');
      console.error('Error loading sitemap details:', error);
    } finally {
      setLoadingSitemapDetail(false);
    }
  };
  
  const downloadSitemap = (format: 'json' | 'md' | 'csv') => {
    if (!sitemapDetail) return;
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      
      // Format the content based on the requested format
      if (format === 'json') {
        content = JSON.stringify(sitemapDetail.sitemap, null, 2);
        filename = `sitemap-${sitemapDetail.id}.json`;
        mimeType = 'application/json';
      } else if (format === 'md') {
        // Use the markdown if available, otherwise generate it
        content = sitemapDetail.sitemap.markdown || generateMarkdown(sitemapDetail.sitemap);
        filename = `sitemap-${sitemapDetail.id}.md`;
        mimeType = 'text/markdown';
      } else {
        // CSV format
        content = generateCSV(sitemapDetail.sitemap);
        filename = `sitemap-${sitemapDetail.id}.csv`;
        mimeType = 'text/csv';
      }
      
      // Create blob and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading sitemap as ${format}:`, error);
      alert(`Failed to download sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Helper function to generate Markdown from sitemap data
  // Utility: format file sizes
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  // Utility: format load times
  const formatLoadTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };
  // Utility: map HTTP status code to MUI Chip color
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 400) return 'error';
    return 'default';
  };
  const generateMarkdown = (sitemap: any) => {
    let md = `# Sitemap for ${sitemap.domain}\n\n`;
    md += `URL: ${sitemap.startUrl}\n\n`;
    md += `Generated: ${new Date(sitemap.timestamp).toLocaleString()}\n\n`;
    md += `Total Pages: ${sitemap.totalPages}\n`;
    md += `Max Depth: ${sitemap.totalDepth}\n`;
    md += `Crawl Time: ${(sitemap.crawlTime / 1000).toFixed(1)} seconds\n\n`;
    
    md += `## Statistics\n\n`;
    md += `- Internal Links: ${sitemap.statistics.internalLinks}\n`;
    md += `- External Links: ${sitemap.statistics.externalLinks}\n`;
    md += `- Assets: ${sitemap.statistics.assets}\n`;
    md += `- Errors: ${sitemap.statistics.errors}\n`;
    md += `- Average Load Time: ${sitemap.statistics.averageLoadTime.toFixed(0)} ms\n\n`;
    
    md += `## Pages\n\n`;
    sitemap.pages.forEach((page: any, index: number) => {
      md += `### ${index + 1}. ${page.title || 'Untitled'}\n\n`;
      md += `- URL: ${page.url}\n`;
      md += `- Depth: ${page.depth}\n`;
      md += `- Status: ${page.statusCode}\n`;
      md += `- Content Type: ${page.contentType}\n`;
      md += `- Size: ${formatFileSize(page.size)}\n`;
      md += `- Load Time: ${page.loadTime} ms\n\n`;
      
      if (page.links.length > 0) {
        md += `#### Links:\n\n`;
        page.links.forEach((link: any) => {
          md += `- [${link.text || link.url}](${link.url}) (${link.type})\n`;
        });
        md += `\n`;
      }
    });
    
    return md;
  };
  
  // Helper function to generate CSV from sitemap data
  const generateCSV = (sitemap: any) => {
    // CSV header
    let csv = 'Page URL,Title,Depth,Status Code,Content Type,Size (bytes),Load Time (ms)\n';
    
    // Add each page as a row
    sitemap.pages.forEach((page: any) => {
      // Escape CSV values to handle commas and quotes
      const escapeCsv = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
      
      csv += [
        escapeCsv(page.url),
        escapeCsv(page.title || 'Untitled'),
        page.depth,
        page.statusCode,
        escapeCsv(page.contentType),
        page.size,
        page.loadTime
      ].join(',') + '\n';
    });
    
    return csv;
  };
  
  // Create a mass scrape job from selected URLs
  const createMassScrapeJob = async () => {
    if (!sitemapDetail || selectedUrls.length === 0) return;
    
    setCreatingMassScrapeJob(true);
    setMassScrapeError('');
    
    try {
      // Default batch name if not provided
      const batchName = massScrapeBatchName || 
        `Sitemap Batch - ${sitemapDetail.sitemap.domain} - ${new Date().toLocaleString()}`;
      
      const response = await fetch('http://localhost:3001/api/mass-scrape/from-dive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diveJobId: sitemapDetail.id, // Use the sitemap ID as the dive job ID
          selectedUrls,
          batchName,
          options: massScrapeOptions,
          createCorpus,
          corpusName: createCorpus ? (corpusName || `Corpus from dive ${sitemapDetail.id}`) : undefined,
          corpusDescription: createCorpus ? (corpusDescription || `Content collected from dive ${sitemapDetail.id}`) : undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Close the mass scrape dialog
        setMassScrapingDialogOpen(false);
        
        // Reset form state
        setSelectedUrls([]);
        setMassScrapeBatchName('');
        setCreateCorpus(false);
        setCorpusName('');
        setCorpusDescription('');
        
        // Show success message
        let successMessage = `Mass scrape job created successfully! Batch ID: ${result.data.batchId}`;
        if (result.data.corpusId) {
          successMessage += `\nCorpus created with ID: ${result.data.corpusId}`;
        }
        alert(successMessage);
        // If a corpus was created, link the completed batch results into it
        if (createCorpus && result.data.batchId) {
          try {
            // wait for all jobs to finish before linking results
            await waitForBatchCompletion(result.data.batchId);
            // Link batch results into corpus with proper name/description
            await fetch(`http://localhost:3001/api/corpus/from-batch/${result.data.batchId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                corpusName: corpusName || `Corpus from dive ${sitemapDetail.id}`,
                corpusDescription: corpusDescription || `Content collected from dive ${sitemapDetail.id}`
              })
            });
          } catch (linkErr) {
            console.error('Error linking batch results to corpus:', linkErr);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to create mass scrape job');
      }
    } catch (error) {
      setMassScrapeError(`Error creating mass scrape job: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreatingMassScrapeJob(false);
    }
  };
  
  // Helper to wait until mass scrape batch completes before linking to corpus
  const waitForBatchCompletion = async (batchId: string, interval = 2000) => {
    while (true) {
      try {
        const resp = await fetch(`http://localhost:3001/api/mass-scrape/${batchId}`);
        if (resp.ok) {
          const json = await resp.json();
          const prog = json.data.progress;
          if (prog.completed >= prog.total) {
            break;
          }
        }
      } catch (e) {
        console.warn(`Batch status fetch failed for ${batchId}:`, e);
      }
      await new Promise(res => setTimeout(res, interval));
    }
  };

  // Toggle URL selection for mass scraping
  const toggleUrlSelection = (url: string) => {
    setSelectedUrls(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      } else {
        return [...prev, url];
      }
    });
  };
  
  // Select/deselect all URLs
  const toggleSelectAllUrls = () => {
    if (!sitemapDetail) return;
    
    if (selectedUrls.length === sitemapDetail.sitemap.pages.length) {
      // If all are selected, deselect all
      setSelectedUrls([]);
    } else {
      // Otherwise select all
      setSelectedUrls(sitemapDetail.sitemap.pages.map(page => page.url));
    }
  };
  
  const refreshData = () => {
    loadCacheStats();
    loadContentEntries();
    loadSitemapEntries();
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/content/${entryId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setContentEntries(prev => prev.filter(entry => entry.id !== entryId));
        loadCacheStats(); // Refresh stats
      } else {
        console.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const exportEntry = async (entryId: string) => {
    try {
      const response = await fetch('/api/content/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: [entryId] })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `content-${entryId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to export entry');
      }
    } catch (error) {
      console.error('Error exporting entry:', error);
    }
  };

  const getUniqueValues = (field: keyof CacheEntry) => {
    return [...new Set(contentEntries.map(entry => entry[field]))];
  };

  // Create the initial state
  const initialState = {
    tabValue: 0,
    contentEntries: [],
    filteredEntries: [],
    sitemapEntries: [],
    filteredSitemaps: [],
    cacheStats: null,
    loading: false,
    sitemapsLoading: false,
    error: '',
    sitemapError: '',
    sitemapDetail: null,
    sitemapViewOpen: false,
    loadingSitemapDetail: false,
    sitemapDetailError: '',
    massScrapingDialogOpen: false,
    selectedUrls: [],
    massScrapeBatchName: '',
    creatingMassScrapeJob: false,
    massScrapeError: '',
    massScrapeOptions: {
      bypassCache: false,
      saveResults: true
    },
    createCorpus: false,
    corpusName: '',
    corpusDescription: '',
    searchTerm: '',
    domainFilter: 'all',
    statusFilter: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc',
    page: 1,
    itemsPerPage: 12,
    selectedEntry: null,
    previewOpen: false,
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storage color="primary" />
            Content Browser
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={refreshData} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear All Cache">
              <IconButton onClick={clearAllCache} color="error">
                <ClearAll />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Cache Stats */}
        {cacheStats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="h6" color="primary">{cacheStats.totalKeys}</Typography>
                  <Typography variant="caption">Total Entries</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="h6" color="success.main">{cacheStats.hitRate.toFixed(1)}%</Typography>
                  <Typography variant="caption">Hit Rate</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="h6" color="info.main">{cacheStats.memoryUsage}</Typography>
                  <Typography variant="caption">Memory Usage</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="h6" color="warning.main">{cacheStats.totalHits}</Typography>
                  <Typography variant="caption">Cache Hits</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Content Library" icon={<Article />} />
          <Tab label="Sitemaps" icon={<Language />} />
          <Tab label="Cache Analytics" icon={<Analytics />} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Search and Filters */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Domain</InputLabel>
                  <Select
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Domains</MenuItem>
                    {getUniqueValues('domain').map((domain) => (
                      <MenuItem key={String(domain)} value={String(domain)}>{String(domain)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="success">Success (2xx)</MenuItem>
                    <MenuItem value="error">Error (4xx+)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="timestamp">Date</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                    <MenuItem value="loadTime">Load Time</MenuItem>
                    <MenuItem value="size">Size</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  fullWidth
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Content Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <Grid container spacing={2}>
                {paginatedEntries.map((entry: CacheEntry) => (
                  <Grid item xs={12} md={6} lg={4} key={entry.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                            {entry.title || 'Untitled'}
                          </Typography>
                          <Chip
                            label={entry.statusCode}
                            color={getStatusColor(entry.statusCode)}
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                          {entry.url}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mb: 2, height: 40, overflow: 'hidden' }}>
                          {entry.text.substring(0, 100)}...
                        </Typography>
                        
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip icon={<Language />} label={entry.domain} size="small" variant="outlined" />
                          <Chip icon={<Speed />} label={formatLoadTime(entry.loadTime)} size="small" variant="outlined" />
                        </Stack>
                        
                        <Stack direction="row" spacing={1}>
                          <Chip icon={<Link />} label={entry.linksCount} size="small" variant="outlined" />
                          <Chip icon={<Image />} label={entry.imagesCount} size="small" variant="outlined" />
                          <Chip label={formatFileSize(entry.size)} size="small" variant="outlined" />
                        </Stack>
                      </CardContent>
                      
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setSelectedEntry(entry);
                            setPreviewOpen(true);
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Download />}
                          onClick={() => exportEntry(entry.id)}
                        >
                          Export
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<Delete />} 
                          color="error"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          Remove
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {filteredEntries.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={Math.ceil(filteredEntries.length / itemsPerPage)}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Search and Filters for Sitemaps */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search sitemaps..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    const filtered = sitemapEntries.filter(entry => 
                      entry.domain.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      entry.url.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    setFilteredSitemaps(filtered);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      const sortField = e.target.value as keyof SitemapEntry;
                      const sorted = [...filteredSitemaps].sort((a, b) => {
                        let aValue: any = a[sortField];
                        let bValue: any = b[sortField];
                        
                        if (sortField === 'createdAt') {
                          aValue = new Date(aValue).getTime();
                          bValue = new Date(bValue).getTime();
                        }
                        
                        if (sortOrder === 'asc') {
                          return aValue > bValue ? 1 : -1;
                        } else {
                          return aValue < bValue ? 1 : -1;
                        }
                      });
                      setFilteredSitemaps(sorted);
                    }}
                  >
                    <MenuItem value="createdAt">Date</MenuItem>
                    <MenuItem value="domain">Domain</MenuItem>
                    <MenuItem value="totalPages">Page Count</MenuItem>
                    <MenuItem value="maxDepth">Depth</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                    setSortOrder(newOrder);
                    setFilteredSitemaps([...filteredSitemaps].reverse());
                  }}
                  fullWidth
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={loadSitemapEntries}
                  fullWidth
                >
                  Refresh Sitemaps
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Sitemaps Grid */}
          {sitemapsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : sitemapError ? (
            <Alert severity="error">{sitemapError}</Alert>
          ) : (
            <>
              <Grid container spacing={2}>
                {filteredSitemaps.map((entry) => (
                  <Grid item xs={12} md={6} key={entry.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                            {entry.domain || 'Unknown Domain'}
                          </Typography>
                          <Chip
                            label={`${entry.totalPages} pages`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 2 }}>
                          {entry.url}
                        </Typography>
                        
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip icon={<Language />} label={entry.engineUsed} size="small" variant="outlined" />
                        </Stack>
                        
                        <Stack direction="row" spacing={1}>
                          <Chip icon={<Schedule />} label={new Date(entry.createdAt).toLocaleString()} size="small" variant="outlined" />
                          <Chip label={`Depth: ${entry.maxDepth}`} size="small" variant="outlined" />
                        </Stack>
                      </CardContent>
                      
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => viewSitemap(entry.id)}
                        >
                          View Map
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Download />}
                          aria-label="Export Options"
                          onClick={(e: React.MouseEvent) => {
                            // Prevent default
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // We'll handle this directly here as a simple menu isn't needed
                            // First load the sitemap, then provide download options
                            viewSitemap(entry.id).then(() => {
                              // Function will set sitemapDetail and open dialog
                            });
                          }}
                        >
                          Export
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* No sitemaps message */}
              {filteredSitemaps.length === 0 && (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No sitemaps found. Use the Dive tool to create site maps.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Cache Analytics (Coming Soon)
          </Typography>
          <Typography color="text.secondary">
            This section will show detailed analytics about cache performance, hit rates, and usage patterns.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedEntry && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedEntry.title}</Typography>
                <Chip
                  icon={<Cached />}
                  label="Cached"
                  color="primary"
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedEntry.url}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">
                {selectedEntry.text}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button variant="contained" startIcon={<Download />}>
                Export
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Mass Scrape Dialog */}
      <Dialog
        open={massScrapingDialogOpen}
        onClose={() => {
          if (!creatingMassScrapeJob) {
            setMassScrapingDialogOpen(false);
            setCreateCorpus(false);
            setCorpusName('');
            setCorpusDescription('');
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Mass Scrape Job</DialogTitle>
        <DialogContent>
          {massScrapeError && (
            <Alert severity="error" sx={{ mb: 2 }}>{massScrapeError}</Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Create a mass scrape job for {selectedUrls.length > 0 ? selectedUrls.length : 'all'} URLs 
            from the sitemap for {sitemapDetail?.sitemap.domain || 'this domain'}.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Batch Name"
              value={massScrapeBatchName}
              onChange={(e) => setMassScrapeBatchName(e.target.value)}
              placeholder="Enter a descriptive name for this batch job"
              margin="normal"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Scrape Options
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={massScrapeOptions.bypassCache}
                  onChange={(e) => setMassScrapeOptions(prev => ({
                    ...prev,
                    bypassCache: e.target.checked
                  }))}
                />
              }
              label="Bypass cache (force fresh scrape)"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={massScrapeOptions.saveResults}
                  onChange={(e) => setMassScrapeOptions(prev => ({
                    ...prev,
                    saveResults: e.target.checked
                  }))}
                />
              }
              label="Save results to cache"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Corpus Options
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={createCorpus}
                  onChange={(e) => setCreateCorpus(e.target.checked)}
                />
              }
              label="Create Corpus from Results"
            />
            
            {createCorpus && (
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Corpus Name (Optional)"
                  value={corpusName}
                  onChange={(e) => setCorpusName(e.target.value)}
                  margin="normal"
                  helperText="Leave blank to use default name"
                  size="small"
                />
                
                <TextField
                  fullWidth
                  label="Corpus Description (Optional)"
                  value={corpusDescription}
                  onChange={(e) => setCorpusDescription(e.target.value)}
                  margin="normal"
                  multiline
                  rows={2}
                  size="small"
                />
              </Box>
            )}
            
            {selectedUrls.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected URLs ({selectedUrls.length}):
                </Typography>
                <Paper variant="outlined" sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
                  {selectedUrls.map((url, index) => (
                    <Typography key={index} variant="body2" noWrap>
                      • {url}
                    </Typography>
                  ))}
                </Paper>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setMassScrapingDialogOpen(false)} 
            disabled={creatingMassScrapeJob}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createMassScrapeJob}
            disabled={creatingMassScrapeJob}
            startIcon={creatingMassScrapeJob ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {creatingMassScrapeJob ? 'Creating...' : 'Start Mass Scrape'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sitemap View Dialog */}
      <Dialog
        open={sitemapViewOpen}
        onClose={() => setSitemapViewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {loadingSitemapDetail ? (
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          </DialogContent>
        ) : sitemapDetailError ? (
          <DialogContent>
            <Alert severity="error">{sitemapDetailError}</Alert>
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button onClick={() => setSitemapViewOpen(false)}>Close</Button>
            </Box>
          </DialogContent>
        ) : sitemapDetail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Sitemap: {sitemapDetail.sitemap.domain}
                </Typography>
                <Chip
                  icon={<Language />}
                  label={`${sitemapDetail.sitemap.totalPages} pages`}
                  color="primary"
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Root URL: {sitemapDetail.sitemap.startUrl}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {sitemapDetail.createdAt.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Engine: {sitemapDetail.metadata?.engineUsed || 'Unknown'}
                </Typography>
              </Box>
              
              {/* Sitemap Stats */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {sitemapDetail.sitemap.totalPages}
                      </Typography>
                      <Typography variant="caption">Pages</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {sitemapDetail.sitemap.totalDepth}
                      </Typography>
                      <Typography variant="caption">Max Depth</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {sitemapDetail.sitemap.statistics.internalLinks}
                      </Typography>
                      <Typography variant="caption">Internal Links</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {sitemapDetail.sitemap.statistics.externalLinks}
                      </Typography>
                      <Typography variant="caption">External Links</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
              
              {/* Pages List */}
              <Typography variant="h6" gutterBottom>
                Pages
              </Typography>
              <Paper variant="outlined">
                <Box sx={{ overflow: 'auto', maxHeight: '400px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={selectedUrls.length > 0 && selectedUrls.length < sitemapDetail.sitemap.pages.length}
                            checked={selectedUrls.length === sitemapDetail.sitemap.pages.length && sitemapDetail.sitemap.pages.length > 0}
                            onChange={() => toggleSelectAllUrls()}
                          />
                        </TableCell>
                        <TableCell>URL</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Depth</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Links</TableCell>
                        <TableCell>Load Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sitemapDetail.sitemap.pages.map((page, index) => (
                        <TableRow 
                          key={index}
                          hover
                          selected={selectedUrls.includes(page.url)}
                          onClick={(e) => {
                            // Only toggle if not clicking the checkbox (which has its own handler)
                            if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                              toggleUrlSelection(page.url);
                            }
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedUrls.includes(page.url)}
                              onChange={() => toggleUrlSelection(page.url)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              <Tooltip title={page.url}>
                                <span>{page.url}</span>
                              </Tooltip>
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              <Tooltip title={page.title}>
                                <span>{page.title || '(No title)'}</span>
                              </Tooltip>
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{page.depth}</TableCell>
                          <TableCell>
                            <Chip
                              label={page.statusCode}
                              color={getStatusColor(page.statusCode)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{page.links.length}</TableCell>
                          <TableCell>{formatLoadTime(page.loadTime)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSitemapViewOpen(false)}>Close</Button>
              <Button 
                variant="outlined" 
                startIcon={<Download />}
                onClick={() => downloadSitemap('csv')}
              >
                Export CSV
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Download />}
                onClick={() => downloadSitemap('md')}
              >
                Export Markdown
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Download />}
                onClick={() => downloadSitemap('json')}
              >
                Export JSON
              </Button>
              <Box flexGrow={1} />
              <Button
                variant="contained"
                color="secondary"
                startIcon={selectedUrls.length > 0 ? <FilterList /> : <Search />}
                onClick={() => {
                  setMassScrapeOptions({
                    bypassCache: false,
                    saveResults: true
                  });
                  setMassScrapeBatchName(`Sitemap Batch - ${sitemapDetail.sitemap.domain} - ${new Date().toLocaleString()}`);
                  setMassScrapingDialogOpen(true);
                }}
                disabled={sitemapDetail.sitemap.pages.length === 0}
              >
                Mass Scrape {selectedUrls.length > 0 ? `(${selectedUrls.length} Selected)` : 'Pages'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ContentBrowser;
