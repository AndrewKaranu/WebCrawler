import React, { useState } from 'react';
import '../styles/glassmorphic.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Stack,
  CardHeader
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
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

// Glassmorphic styling - matching Dashboard design
const glassCardSx: SxProps<Theme> = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(168, 85, 247, 0.2)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
};

const glassButtonSx: SxProps<Theme> = {
  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(147, 51, 234, 0.8))',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(168, 85, 247, 0.3)',
  borderRadius: '12px',
  color: 'white',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '1rem',
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(147, 51, 234, 0.9))',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 24px rgba(168, 85, 247, 0.4)',
  },
  '&:disabled': {
    background: 'rgba(168, 85, 247, 0.3)',
    color: 'rgba(255, 255, 255, 0.5)',
  }
};

const glassTextFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    '& fieldset': {
      borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(168, 85, 247, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(168, 85, 247, 0.8)',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '& .MuiInputBase-input': {
    color: 'white',
  }
};

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
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const [showAdvanced, setShowAdvanced] = useState(false);

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
          setProgress(result.data);
          
          if (result.data.status === 'completed') {
            stopProgressMonitoring();
            setLoading(false);
            setCurrentJobId(null);
            setSitemap(result.data.sitemap);
          } else if (result.data.status === 'failed') {
            stopProgressMonitoring();
            setLoading(false);
            setCurrentJobId(null);
            setError(result.data.error || 'Job failed');
          }
        }
      } catch (err) {
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, rgba(168, 85, 247, 0.1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0.95) 100%)',
        position: 'relative',
        overflow: 'auto',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        <Stack spacing={4} alignItems="center">
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              textAlign: 'center',
              mb: 2
            }}
          >
            Website Diving & Sitemap Generation
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              mb: 4
            }}
          >
            Deep dive into website structure and generate comprehensive sitemaps with markdown export.
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{
                width: '100%',
                maxWidth: 800,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'rgba(239, 68, 68, 0.8)'
                }
              }}
            >
              {error}
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert 
              severity="warning"
              sx={{
                width: '100%',
                maxWidth: 800,
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'rgba(245, 158, 11, 0.8)'
                }
              }}
            >
              {warnings.join(', ')}
            </Alert>
          )}

          {progress && (
            <Box sx={{ width: '100%', maxWidth: 800 }}>
              <Card sx={glassCardSx}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                    {currentJobId ? `Job ${currentJobId}: ` : ''}Dive in Progress...
                  </Typography>
                  {progress.domain && (
                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                      <strong>Domain:</strong> {progress.domain}
                    </Typography>
                  )}
                  {progress.baseUrl && (
                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                      <strong>Base URL:</strong> {progress.baseUrl}
                    </Typography>
                  )}
                  {progress.status && (
                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                      <strong>Status:</strong> {progress.status}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Processed: {progress.processed || 0} pages | Queued: {progress.queued || 0} | Visited: {progress.visited || 0}
                  </Typography>
                  <LinearProgress 
                    sx={{ 
                      mt: 2,
                      background: 'rgba(168, 85, 247, 0.2)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #a855f7, #9333ea)'
                      }
                    }} 
                  />
                  {currentJobId && (
                    <Button
                      onClick={stopCurrentJob}
                      startIcon={<StopIcon />}
                      sx={{
                        ...glassButtonSx,
                        background: 'transparent',
                        color: 'rgba(239, 68, 68, 0.8)',
                        mt: 2,
                        '&:hover': {
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'rgba(239, 68, 68, 1)',
                        }
                      }}
                    >
                      Stop Job
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Card sx={glassCardSx}>
              <CardHeader 
                title="Dive Configuration"
                avatar={<TravelExploreIcon sx={{ color: 'rgba(168, 85, 247, 0.8)' }} />}
                sx={{ 
                  '& .MuiCardHeader-title': { 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '1.25rem'
                  }
                }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={3}>
                  <TextField
                    label="Website URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    fullWidth
                    placeholder="https://example.com"
                    required
                    sx={glassTextFieldSx}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Max Depth"
                      type="number"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 10 }}
                      helperText="How deep to crawl (1-10)"
                      sx={glassTextFieldSx}
                    />
                    <TextField
                      label="Max Pages"
                      type="number"
                      value={maxPages}
                      onChange={(e) => setMaxPages(parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 1000 }}
                      helperText="Maximum pages to process (1-1000)"
                      sx={glassTextFieldSx}
                    />
                  </Box>

                  <TextField
                    label="Delay (ms)"
                    type="number"
                    value={delay}
                    onChange={(e) => setDelay(parseInt(e.target.value))}
                    helperText="Delay between requests"
                    sx={glassTextFieldSx}
                  />

                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Engine Type</InputLabel>
                    <Select
                      value={engineType}
                      onChange={(e) => setEngineType(e.target.value as 'spider' | 'puppeteer')}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '12px',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(168, 85, 247, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(168, 85, 247, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(168, 85, 247, 0.8)',
                        },
                      }}
                    >
                      <MenuItem value="spider">Spider Engine</MenuItem>
                      <MenuItem value="puppeteer">Puppeteer</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={followExternalLinks}
                          onChange={(e) => setFollowExternalLinks(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#a855f7',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#a855f7',
                            },
                          }}
                        />
                      }
                      label="Follow External Links"
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          color: 'rgba(255, 255, 255, 0.9)' 
                        } 
                      }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeAssets}
                          onChange={(e) => setIncludeAssets(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#a855f7',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#a855f7',
                            },
                          }}
                        />
                      }
                      label="Include Assets"
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          color: 'rgba(255, 255, 255, 0.9)' 
                        } 
                      }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={respectRobotsTxt}
                          onChange={(e) => setRespectRobotsTxt(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#a855f7',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#a855f7',
                            },
                          }}
                        />
                      }
                      label="Respect Robots.txt"
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          color: 'rgba(255, 255, 255, 0.9)' 
                        } 
                      }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={stayWithinBaseUrl}
                          onChange={(e) => setStayWithinBaseUrl(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#a855f7',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#a855f7',
                            },
                          }}
                        />
                      }
                      label="Stay Within Base URL"
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          color: 'rgba(255, 255, 255, 0.9)' 
                        } 
                      }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Accordion 
              expanded={showAdvanced}
              onChange={() => setShowAdvanced(!showAdvanced)}
              sx={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                boxShadow: 'none',
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
                sx={{ 
                  '& .MuiAccordionSummary-content': { 
                    margin: '16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }
                }}
              >
                <SettingsIcon sx={{ color: 'rgba(168, 85, 247, 0.8)' }} />
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                  Advanced Settings
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <TextField
                    label="User Agent (Optional)"
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    fullWidth
                    placeholder="Custom user agent string"
                    sx={glassTextFieldSx}
                  />
                  
                  <TextField
                    label="Exclude Patterns (one per line)"
                    value={excludePatterns}
                    onChange={(e) => setExcludePatterns(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="/admin&#10;/login&#10;*.pdf"
                    sx={glassTextFieldSx}
                  />
                  
                  <TextField
                    label="Include Patterns (one per line)"
                    value={includePatterns}
                    onChange={(e) => setIncludePatterns(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="/blog/*&#10;/products/*"
                    sx={glassTextFieldSx}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Card sx={glassCardSx}>
              <CardHeader 
                title="Actions"
                sx={{ 
                  '& .MuiCardHeader-title': { 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '1.25rem'
                  }
                }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                  <Button
                    onClick={handleDive}
                    disabled={loading || !url.trim()}
                    startIcon={<TravelExploreIcon />}
                    sx={{
                      ...glassButtonSx,
                      px: 4,
                      py: 1.5
                    }}
                  >
                    START DIVE
                  </Button>
                  
                  <Button
                    onClick={handlePreview}
                    disabled={loading || !url.trim()}
                    startIcon={<VisibilityIcon />}
                    sx={{
                      ...glassButtonSx,
                      background: 'transparent',
                      color: 'rgba(168, 85, 247, 0.8)',
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        background: 'rgba(168, 85, 247, 0.1)',
                        color: 'rgba(168, 85, 247, 1)',
                      }
                    }}
                  >
                    QUICK PREVIEW
                  </Button>
                  
                  <Button
                    onClick={handleValidate}
                    startIcon={<InfoIcon />}
                    sx={{
                      ...glassButtonSx,
                      background: 'transparent',
                      color: 'rgba(34, 197, 94, 0.8)',
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'rgba(34, 197, 94, 1)',
                      }
                    }}
                  >
                    VALIDATE CONFIG
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default DiveTest;
