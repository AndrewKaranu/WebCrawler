import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormControlLabel,
  Switch,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import MapIcon from '@mui/icons-material/Map';
import LinkIcon from '@mui/icons-material/Link';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CodeIcon from '@mui/icons-material/Code';
import MouseIcon from '@mui/icons-material/Mouse';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import StopIcon from '@mui/icons-material/Stop';

interface DiveRequest {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  followExternalLinks?: boolean;
  includeAssets?: boolean;
  respectRobotsTxt?: boolean;
  stayWithinBaseUrl?: boolean;
  delay?: number;
  userAgent?: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  engineType?: 'spider' | 'puppeteer';
}

interface PageInfo {
  url: string;
  title: string;
  depth: number;
  statusCode: number;
  contentType: string;
  size: number;
  loadTime: number;
  links: Array<{
    url: string;
    text: string;
    type: 'internal' | 'external' | 'asset';
  }>;
  meta: Record<string, string>;
  headers: Record<string, string>;
  timestamp: Date;
  error?: string;
}

interface SiteMap {
  domain: string;
  startUrl: string;
  pages: PageInfo[];
  totalPages: number;
  totalDepth: number;
  crawlTime: number;
  statistics: {
    internalLinks: number;
    externalLinks: number;
    assets: number;
    errors: number;
    averageLoadTime: number;
  };
  timestamp: Date;
  markdown?: string;
}

const DiveTest: React.FC = () => {
  const [url, setUrl] = useState('https://example.com');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(25);
  const [followExternalLinks, setFollowExternalLinks] = useState(false);
  const [includeAssets, setIncludeAssets] = useState(false);
  const [respectRobotsTxt, setRespectRobotsTxt] = useState(true);
  const [stayWithinBaseUrl, setStayWithinBaseUrl] = useState(true);
  const [delay, setDelay] = useState(1000);
  const [userAgent, setUserAgent] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [includePatterns, setIncludePatterns] = useState('');
  const [engineType, setEngineType] = useState<'spider' | 'puppeteer'>('spider');
  
  const [loading, setLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ 
    processed: number; 
    queued: number; 
    visited: number;
    status?: string;
    domain?: string;
    baseUrl?: string;
  } | null>(null);
  const [sitemap, setSitemap] = useState<SiteMap | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const [showSitemapDialog, setShowSitemapDialog] = useState(false);
  const [showMarkdownDialog, setShowMarkdownDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const progressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const startProgressMonitoring = (jobId: string) => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    
    progressTimer.current = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/dive/progress/${jobId}`);
        const result = await response.json();
        if (result.success) {
          const jobData = result.data;
          
          // Update progress from job progress data
          if (jobData.progress) {
            setProgress(jobData.progress);
          }
          
          // Check if job is completed
          if (jobData.state === 'completed' && jobData.result) {
            setSitemap(jobData.result.sitemap);
            setAnalysis(jobData.result.analysis);
            setWarnings(jobData.result.warnings || []);
            setLoading(false);
            stopProgressMonitoring();
            console.log('Dive completed successfully:', jobData.result);
          } else if (jobData.state === 'failed') {
            setError(jobData.error || 'Job failed');
            setLoading(false);
            stopProgressMonitoring();
          }
        }
      } catch (err) {
        // Ignore progress errors
        console.warn('Progress monitoring error:', err);
      }
    }, 2000);
  };

  const stopProgressMonitoring = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setProgress(null);
  };

  const stopCurrentJob = async () => {
    if (!currentJobId) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/jobs/${currentJobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCurrentJobId(null);
        setLoading(false);
        stopProgressMonitoring();
        setProgress(null);
        console.log('Job stopped successfully');
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to stop job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error stopping job');
    }
  };

  React.useEffect(() => {
    return () => {
      stopProgressMonitoring();
    };
  }, []);

  const handleDive = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setSitemap(null);
    setAnalysis(null);
    
    const diveRequest: DiveRequest = {
      url,
      maxDepth,
      maxPages,
      followExternalLinks,
      includeAssets,
      respectRobotsTxt,
      stayWithinBaseUrl,
      delay,
      userAgent: userAgent || undefined,
      excludePatterns: excludePatterns ? excludePatterns.split('\n').filter(p => p.trim()) : undefined,
      includePatterns: includePatterns ? includePatterns.split('\n').filter(p => p.trim()) : undefined,
      engineType,
    };

    try {
      const response = await fetch('http://localhost:3001/api/dive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diveRequest),
      });

      const result = await response.json();
      
      if (result.success && result.jobId) {
        setCurrentJobId(result.jobId);
        startProgressMonitoring(result.jobId);
        console.log('Dive job started with ID:', result.jobId);
      } else {
        throw new Error(result.errors?.join(', ') || 'Unknown error');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/dive/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      
      if (result.success && result.jobId) {
        console.log('Preview job started with ID:', result.jobId);
        alert(`Preview job started! Job ID: ${result.jobId}. Check the Jobs tab to monitor progress.`);
      } else {
        throw new Error(result.errors?.join(', ') || 'Unknown error');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    const diveRequest: DiveRequest = {
      url,
      maxDepth,
      maxPages,
      followExternalLinks,
      includeAssets,
      respectRobotsTxt,
      stayWithinBaseUrl,
      delay,
      userAgent: userAgent || undefined,
      excludePatterns: excludePatterns ? excludePatterns.split('\n').filter(p => p.trim()) : undefined,
      includePatterns: includePatterns ? includePatterns.split('\n').filter(p => p.trim()) : undefined,
      engineType,
    };

    try {
      const response = await fetch('http://localhost:3001/api/dive/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diveRequest),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Validation passed! Configuration is valid.');
        setWarnings(result.warnings || []);
      } else {
        alert('❌ Validation failed:\n' + result.errors?.join('\n'));
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  const downloadMarkdown = () => {
    if (!sitemap?.markdown) return;
    
    const blob = new Blob([sitemap.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitemap-${sitemap.domain}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSitemapJson = () => {
    if (!sitemap) return;
    
    const blob = new Blob([JSON.stringify(sitemap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitemap-${sitemap.domain}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (page: PageInfo) => {
    if (page.error) return <ErrorIcon color="error" />;
    if (page.statusCode === 200) return <CheckCircleIcon color="success" />;
    return <WarningIcon color="warning" />;
  };

  const formatLoadTime = (ms: number) => {
    if (ms > 3000) return `${ms}ms (slow)`;
    if (ms > 1500) return `${ms}ms (medium)`;
    return `${ms}ms (fast)`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Website Diving & Sitemap Generation
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Deep dive into website structure and generate comprehensive sitemaps with markdown export.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warnings.join(', ')}
        </Alert>
      )}

      {progress && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            {currentJobId ? `Job ${currentJobId}: ` : ''}Dive in Progress...
          </Typography>
          {progress.domain && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Domain:</strong> {progress.domain}
            </Typography>
          )}
          {progress.baseUrl && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Base URL:</strong> {progress.baseUrl}
            </Typography>
          )}
          {progress.status && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Status:</strong> {progress.status}
            </Typography>
          )}
          <Typography variant="body2">
            Processed: {progress.processed || 0} pages | Queued: {progress.queued || 0} | Visited: {progress.visited || 0}
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Basic Configuration */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <TravelExploreIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Dive Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Website URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    fullWidth
                    placeholder="https://example.com"
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Max Depth"
                    type="number"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 1, max: 10 }}
                    helperText="How deep to crawl (1-10)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Max Pages"
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 1, max: 1000 }}
                    helperText="Maximum pages to process (1-1000)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Delay (ms)"
                    type="number"
                    value={delay}
                    onChange={(e) => setDelay(Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 100 }}
                    helperText="Delay between requests"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Engine Type</InputLabel>
                    <Select
                      value={engineType}
                      onChange={(e) => setEngineType(e.target.value as 'spider' | 'puppeteer')}
                    >
                      <MenuItem value="spider">Spider Engine</MenuItem>
                      <MenuItem value="puppeteer">Puppeteer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={followExternalLinks}
                          onChange={(e) => setFollowExternalLinks(e.target.checked)}
                        />
                      }
                      label="Follow External Links"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeAssets}
                          onChange={(e) => setIncludeAssets(e.target.checked)}
                        />
                      }
                      label="Include Assets"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={respectRobotsTxt}
                          onChange={(e) => setRespectRobotsTxt(e.target.checked)}
                        />
                      }
                      label="Respect Robots.txt"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={stayWithinBaseUrl}
                          onChange={(e) => setStayWithinBaseUrl(e.target.checked)}
                        />
                      }
                      label="Stay Within Base URL"
                    />
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Advanced Configuration */}
        <Grid item xs={12}>
          <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="User Agent"
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    fullWidth
                    placeholder="Custom user agent (optional)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Exclude Patterns (one per line)"
                    value={excludePatterns}
                    onChange={(e) => setExcludePatterns(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder=".*\\.pdf$&#10;/admin/.*&#10;/private/.*"
                    helperText="Regular expressions to exclude URLs"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Include Patterns (one per line)"
                    value={includePatterns}
                    onChange={(e) => setIncludePatterns(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="/blog/.*&#10;/products/.*"
                    helperText="Regular expressions to include only specific URLs"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleDive}
                disabled={loading || !url}
                startIcon={<TravelExploreIcon />}
                size="large"
              >
                Start Dive
              </Button>
              {currentJobId && loading && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={stopCurrentJob}
                  startIcon={<StopIcon />}
                  size="large"
                >
                  Stop Job
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handlePreview}
                disabled={loading || !url}
                startIcon={<VisibilityIcon />}
              >
                Quick Preview
              </Button>
              <Button
                variant="outlined"
                onClick={handleValidate}
                disabled={loading || !url}
                startIcon={<InfoIcon />}
              >
                Validate Config
              </Button>
              {sitemap && (
                <>
                  <Button
                    variant="contained"
                    onClick={() => setShowSitemapDialog(true)}
                    startIcon={<MapIcon />}
                    color="success"
                  >
                    View Sitemap
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowMarkdownDialog(true)}
                    startIcon={<DownloadIcon />}
                    color="secondary"
                  >
                    View Markdown
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={downloadMarkdown}
                    startIcon={<DownloadIcon />}
                  >
                    Download MD
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={downloadSitemapJson}
                    startIcon={<DownloadIcon />}
                  >
                    Download JSON
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Results Summary */}
        {sitemap && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dive Results Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <Typography variant="h4">{sitemap.totalPages}</Typography>
                      <Typography variant="body2">Total Pages</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                      <Typography variant="h4">{sitemap.totalDepth + 1}</Typography>
                      <Typography variant="body2">Depth Levels</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography variant="h4">{Math.round(sitemap.crawlTime / 1000)}s</Typography>
                      <Typography variant="body2">Crawl Time</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: sitemap.statistics.errors > 0 ? 'error.light' : 'info.light', color: sitemap.statistics.errors > 0 ? 'error.contrastText' : 'info.contrastText' }}>
                      <Typography variant="h4">{sitemap.statistics.errors}</Typography>
                      <Typography variant="body2">Errors</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                {analysis && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Analysis Insights</Typography>
                    <List dense>
                      {analysis.insights.map((insight: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText primary={insight} />
                        </ListItem>
                      ))}
                    </List>
                    
                    {analysis.recommendations.length > 0 && (
                      <>
                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Recommendations</Typography>
                        <List dense>
                          {analysis.recommendations.map((rec: string, index: number) => (
                            <ListItem key={index}>
                              <ListItemText primary={rec} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Sitemap Dialog */}
      <Dialog open={showSitemapDialog} onClose={() => setShowSitemapDialog(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          Sitemap Details - {sitemap?.domain}
        </DialogTitle>
        <DialogContent>
          {sitemap && (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Depth</TableCell>
                    <TableCell>Load Time</TableCell>
                    <TableCell>Links</TableCell>
                    <TableCell>Expand</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sitemap.pages.map((page, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>{getStatusIcon(page)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {page.title || 'Untitled'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {page.url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={page.depth} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={page.loadTime > 3000 ? 'error' : 'textPrimary'}>
                            {formatLoadTime(page.loadTime)}
                          </Typography>
                        </TableCell>
                        <TableCell>{page.links.length}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleRowExpansion(index)}
                          >
                            {expandedRows.has(index) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                          <Collapse in={expandedRows.has(index)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1 }}>
                              <Typography variant="h6" gutterBottom component="div">
                                Page Details
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={6}>
                                  <Typography variant="subtitle2">Status Code: {page.statusCode}</Typography>
                                  <Typography variant="subtitle2">Content Type: {page.contentType}</Typography>
                                  <Typography variant="subtitle2">Size: {page.size} bytes</Typography>
                                  {page.error && (
                                    <Typography variant="subtitle2" color="error">Error: {page.error}</Typography>
                                  )}
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="subtitle2">Links Found:</Typography>
                                  <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                                    {page.links.slice(0, 10).map((link, linkIndex) => (
                                      <Typography key={linkIndex} variant="body2" noWrap>
                                        <Chip label={link.type} size="small" sx={{ mr: 1 }} />
                                        {link.text || link.url}
                                      </Typography>
                                    ))}
                                    {page.links.length > 10 && (
                                      <Typography variant="body2" color="textSecondary">
                                        ... and {page.links.length - 10} more
                                      </Typography>
                                    )}
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSitemapDialog(false)}>Close</Button>
          <Button onClick={downloadSitemapJson} startIcon={<DownloadIcon />}>
            Download JSON
          </Button>
        </DialogActions>
      </Dialog>

      {/* Markdown Dialog */}
      <Dialog open={showMarkdownDialog} onClose={() => setShowMarkdownDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Markdown Sitemap - {sitemap?.domain}
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={20}
            value={sitemap?.markdown || ''}
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
            InputProps={{
              readOnly: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMarkdownDialog(false)}>Close</Button>
          <Button onClick={downloadMarkdown} startIcon={<DownloadIcon />} variant="contained">
            Download Markdown
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiveTest;
