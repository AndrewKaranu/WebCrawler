import React, { useState } from 'react';
import '../styles/glassmorphic.css';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

interface ScrapeResult {
  success: boolean;
  data?: {
    url: string;
    html: string;
    text: string;
    title: string;
    loadTime: number;
    statusCode: number;
  };
  error?: string;
  timestamp: string;
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

const ScrapeForm: React.FC = () => {
  const [url, setUrl] = useState('https://httpbin.org/html');
  const [engine, setEngine] = useState('spider');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [advancedOptions, setAdvancedOptions] = useState({
    waitForLoad: 2000,
    timeout: 30000,
    headless: true,
    stealth: true,
    bypassCache: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/test/spider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          engine,
          options: advancedOptions,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    setIsLoading(false);
    setResult({
      success: false,
      error: 'Operation cancelled by user',
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'rgba(0, 0, 0, 0.9)',
      padding: 3,
      position: 'relative',
      overflow: 'auto',
      // Hide scrollbar while keeping scroll functionality
      scrollbarWidth: 'none', // Firefox
      msOverflowStyle: 'none', // Internet Explorer 10+
      '&::-webkit-scrollbar': {
        display: 'none' // WebKit browsers
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 60, 198, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }
    }}>
      <Box sx={{ 
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        paddingBottom: 4,
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        {/* Page Title */}
        <Typography 
          sx={{
            fontSize: { xs: '2rem', md: '3rem' },
            fontWeight: 'bold',
            color: 'rgba(255, 255, 255, 0.9)',
            mb: 4,
            textAlign: 'center'
          }}
          component="h1"
        >
          Spider Engine Test
        </Typography>
        
        {/* Form Card */}
        <Card sx={{ ...glassCardSx, width: '100%', maxWidth: '800px' }}>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                {/* URL Input */}
                <TextField
                  label="URL to Scrape"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                  required
                  placeholder="https://example.com"
                  variant="outlined"
                  sx={glassTextFieldSx}
                />

                {/* Engine Selection */}
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Scraping Engine</InputLabel>
                  <Select
                    value={engine}
                    label="Scraping Engine"
                    onChange={(e) => setEngine(e.target.value)}
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
                    <MenuItem value="spider">Spider (CDP)</MenuItem>
                    <MenuItem value="playwright">Playwright</MenuItem>
                    <MenuItem value="selenium">Selenium</MenuItem>
                    <MenuItem value="http">HTTP</MenuItem>
                  </Select>
                </FormControl>

                {/* Advanced Options */}
                <Accordion 
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
                        margin: '16px 0' 
                      }
                    }}
                  >
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                      Advanced Options
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={3}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                          label="Wait for Load (ms)"
                          type="number"
                          value={advancedOptions.waitForLoad}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            waitForLoad: Number(e.target.value)
                          }))}
                          size="small"
                          sx={glassTextFieldSx}
                        />
                        <TextField
                          label="Timeout (ms)"
                          type="number"
                          value={advancedOptions.timeout}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            timeout: Number(e.target.value)
                          }))}
                          size="small"
                          sx={glassTextFieldSx}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={advancedOptions.headless}
                              onChange={(e) => setAdvancedOptions(prev => ({
                                ...prev,
                                headless: e.target.checked
                              }))}
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
                          label={<Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>Headless Mode</Typography>}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={advancedOptions.stealth}
                              onChange={(e) => setAdvancedOptions(prev => ({
                                ...prev,
                                stealth: e.target.checked
                              }))}
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
                          label={<Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>Stealth Mode</Typography>}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={advancedOptions.bypassCache}
                              onChange={(e) => setAdvancedOptions(prev => ({
                                ...prev,
                                bypassCache: e.target.checked
                              }))}
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
                          label={<Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>Bypass Cache</Typography>}
                        />
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading || !url}
                    startIcon={isLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <PlayIcon />}
                    sx={{ ...glassButtonSx, flex: 1, py: 1.5 }}
                  >
                    {isLoading ? 'Scraping...' : 'Start Scraping'}
                  </Button>
                  
                  {isLoading && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleStop}
                      startIcon={<StopIcon />}
                      sx={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        color: '#ef4444',
                        '&:hover': {
                          background: 'rgba(239, 68, 68, 0.2)',
                          borderColor: 'rgba(239, 68, 68, 0.5)',
                        }
                      }}
                    >
                      Stop
                    </Button>
                  )}
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card sx={{ ...glassCardSx, width: '100%', maxWidth: '800px' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h5" 
                gutterBottom
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 600,
                  mb: 3
                }}
              >
                Scraping Results
              </Typography>
              
              {result.success ? (
                <Stack spacing={3}>
                  <Alert 
                    severity="success"
                    sx={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '12px',
                      color: '#22c55e',
                      '& .MuiAlert-icon': {
                        color: '#22c55e'
                      }
                    }}
                  >
                    Successfully scraped {result.data?.url}
                  </Alert>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`Status: ${result.data?.statusCode}`} 
                      sx={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        backdropFilter: 'blur(10px)',
                      }}
                      size="small" 
                    />
                    <Chip 
                      label={`Load Time: ${result.data?.loadTime}ms`} 
                      sx={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        backdropFilter: 'blur(10px)',
                      }}
                      size="small" 
                    />
                    <Chip 
                      label={`Title: ${result.data?.title}`} 
                      sx={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        color: '#a855f7',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        backdropFilter: 'blur(10px)',
                      }}
                      size="small" 
                    />
                  </Box>

                  <Accordion
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
                    >
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        HTML Content ({result.data?.html.length} characters)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper
                        component="pre"
                        sx={{
                          backgroundColor: 'rgba(15, 23, 42, 0.8)',
                          color: '#e2e8f0',
                          p: 3,
                          borderRadius: '12px',
                          overflow: 'auto',
                          maxHeight: 400,
                          fontSize: '0.75rem',
                          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                          border: '1px solid rgba(168, 85, 247, 0.2)',
                          backdropFilter: 'blur(10px)',
                          lineHeight: 1.5,
                        }}
                      >
                        {result.data?.html}
                      </Paper>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion
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
                    >
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        Extracted Text ({result.data?.text?.length} characters)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          p: 3,
                          borderRadius: '12px',
                          maxHeight: 300,
                          overflow: 'auto',
                          border: '1px solid rgba(168, 85, 247, 0.2)',
                          backdropFilter: 'blur(10px)',
                          lineHeight: 1.6,
                          fontSize: '0.9rem',
                        }}
                      >
                        {result.data?.text}
                      </Paper>
                    </AccordionDetails>
                  </Accordion>
                </Stack>
              ) : (
                <Alert 
                  severity="error"
                  sx={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    color: '#ef4444',
                    '& .MuiAlert-icon': {
                      color: '#ef4444'
                    }
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Error occurred:</Typography>
                  <Typography variant="body2">{result.error}</Typography>
                </Alert>
              )}
              
              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 3, 
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}
              >
                Timestamp: {new Date(result.timestamp).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default ScrapeForm;
