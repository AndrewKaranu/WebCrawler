import React, { useState } from 'react';
import '../styles/glassmorphic.css';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Stack,
  Container
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { Add, Delete, PlayArrow, Clear } from '@mui/icons-material';

interface MassScraperFormProps {
  onBatchCreated?: (batchId: string) => void;
}

interface ScrapeOptions {
  engine?: string;
  timeout?: number;
  screenshot?: boolean;
  fullPage?: boolean;
  waitFor?: number;
  userAgent?: string;
}

interface BatchStatus {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  urls: string[];
  createdAt: string;
  corpusId?: string;
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

const MassScraperForm: React.FC<MassScraperFormProps> = ({ onBatchCreated }) => {
  const [urls, setUrls] = useState<string[]>(['']);
  const [batchName, setBatchName] = useState('');
  const [options, setOptions] = useState<ScrapeOptions>({
    engine: 'spider',
    timeout: 30000,
    screenshot: false,
    fullPage: false,
    waitFor: 1000,
    userAgent: 'WebCrawler/1.0'
  });
  
  // Corpus creation options
  const [createCorpus, setCreateCorpus] = useState(false);
  const [corpusName, setCorpusName] = useState('');
  const [corpusDescription, setCorpusDescription] = useState('');
  const [corpusTag, setCorpusTag] = useState('');
  const [corpusTags, setCorpusTags] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeBatches, setActiveBatches] = useState<BatchStatus[]>([]);
  // Track which batches have been linked already
  const [linkedBatches, setLinkedBatches] = useState<Set<string>>(new Set());

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const clearAllUrls = () => {
    setUrls(['']);
  };
  
  const addCorpusTag = () => {
    if (corpusTag.trim() !== '' && !corpusTags.includes(corpusTag)) {
      setCorpusTags([...corpusTags, corpusTag.trim()]);
      setCorpusTag('');
    }
  };
  
  const removeCorpusTag = (tag: string) => {
    setCorpusTags(corpusTags.filter(t => t !== tag));
  };

  const validateUrls = (): boolean => {
    const validUrls = urls.filter(url => {
      if (!url.trim()) return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
    
    if (validUrls.length === 0) {
      setError('Please provide at least one valid URL');
      return false;
    }
    
    return true;
  };

  const createBatch = async () => {
    if (!validateUrls()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const validUrls = urls.filter(url => {
        if (!url.trim()) return false;
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      const response = await fetch('/api/mass-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validUrls,
          batchName: batchName || `Batch - ${new Date().toLocaleString()}`,
          options,
          createCorpus,
          corpusName: createCorpus ? (corpusName || `Corpus for ${batchName || 'Batch'}`) : undefined,
          corpusDescription: createCorpus ? (corpusDescription || 'Auto-generated corpus') : undefined,
          corpusTags: createCorpus ? corpusTags : undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Batch created successfully! ${result.data.total} jobs queued.`);
        setBatchName('');
        setUrls(['']);
        onBatchCreated?.(result.data.batchId);
        loadActiveBatches(); // Refresh the batch list
        // If user requested corpus creation, populate it with batch results
        if (createCorpus && result.data.batchId) {
          try {
            const batchId = result.data.batchId;
            const url = `/api/corpus/from-batch/${batchId}`;
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                corpusName: corpusName || `Corpus for ${batchName || batchId}`,
                corpusDescription: corpusDescription || `Auto-generated corpus for batch ${batchId}`,
                corpusTags
              })
            });
          } catch (err) {
            console.error('Error linking batch to corpus:', err);
          }
        }
      } else {
        setError(result.error || 'Failed to create batch');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveBatches = async () => {
    try {
      const response = await fetch('/api/mass-scrape');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setActiveBatches(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };

  const cancelBatch = async (batchId: string) => {
    try {
      const response = await fetch(`/api/mass-scrape/${batchId}/cancel`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadActiveBatches();
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
    }
  };

  const deleteBatch = async (batchId: string) => {
    try {
      const response = await fetch(`/api/mass-scrape/${batchId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadActiveBatches();
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
    }
  };

  // Monitor activeBatches and auto-link completed ones to corpus
  React.useEffect(() => {
    activeBatches.forEach(batch => {
      if (batch.corpusId && batch.status === 'completed' && !linkedBatches.has(batch.id)) {
        // call API to link batch results into corpus
        fetch(`/api/corpus/from-batch/${batch.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).then(res => {
          if (!res.ok) throw new Error('Linking failed');
        }).catch(err => console.error('Auto-link batch to corpus failed:', err));
        // mark as linked
        setLinkedBatches(prev => new Set(prev).add(batch.id));
      }
    });
  }, [activeBatches, linkedBatches]);

  // Load batches on component mount
  React.useEffect(() => {
    loadActiveBatches();
    const interval = setInterval(loadActiveBatches, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const getProgressPercentage = (progress: BatchStatus['progress']) => {
    if (progress.total === 0) return 0;
    return ((progress.completed + progress.failed) / progress.total) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'info';
      default: return 'default';
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
            Mass Scraper
          </Typography>

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Card sx={glassCardSx}>
              <CardHeader
                title="Batch Configuration"
                subheader="Create batch jobs to scrape multiple URLs simultaneously"
                sx={{ 
                  '& .MuiCardHeader-title': { 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '1.25rem'
                  },
                  '& .MuiCardHeader-subheader': { 
                    color: 'rgba(255, 255, 255, 0.7)' 
                  }
                }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Batch Name (Optional)"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    helperText="Give your batch a descriptive name"
                    sx={glassTextFieldSx}
                  />

                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    URLs to Scrape
                  </Typography>

                  {urls.map((url, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        label={`URL ${index + 1}`}
                        value={url}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        placeholder="https://example.com"
                        error={url.trim() !== '' && (() => {
                          try {
                            new URL(url);
                            return false;
                          } catch {
                            return true;
                          }
                        })()}
                        helperText={url.trim() !== '' && (() => {
                          try {
                            new URL(url);
                            return '';
                          } catch {
                            return 'Invalid URL format';
                          }
                        })()}
                        sx={glassTextFieldSx}
                      />
                      <IconButton 
                        onClick={() => removeUrlField(index)}
                        disabled={urls.length === 1}
                        sx={{ 
                          color: 'rgba(239, 68, 68, 0.8)',
                          '&:hover': {
                            color: 'rgba(239, 68, 68, 1)',
                            background: 'rgba(239, 68, 68, 0.1)'
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ))}

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      startIcon={<Add />}
                      onClick={addUrlField}
                      sx={{
                        ...glassButtonSx,
                        background: 'transparent',
                        color: 'rgba(168, 85, 247, 0.8)',
                        '&:hover': {
                          background: 'rgba(168, 85, 247, 0.1)',
                          color: 'rgba(168, 85, 247, 1)',
                        }
                      }}
                    >
                      Add URL
                    </Button>
                    
                    <Button 
                      size="small" 
                      onClick={clearAllUrls}
                      startIcon={<Clear />}
                      sx={{
                        ...glassButtonSx,
                        background: 'transparent',
                        color: 'rgba(239, 68, 68, 0.8)',
                        '&:hover': {
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'rgba(239, 68, 68, 1)',
                        }
                      }}
                    >
                      Clear All
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Card sx={glassCardSx}>
              <CardHeader
                title="Scrape Options"
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={options.screenshot || false}
                          onChange={(e) => setOptions({...options, screenshot: e.target.checked})}
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
                      label="Take Screenshots"
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          color: 'rgba(255, 255, 255, 0.9)' 
                        } 
                      }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={options.fullPage || false}
                          onChange={(e) => setOptions({...options, fullPage: e.target.checked})}
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
                      label="Full Page Screenshot"
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          color: 'rgba(255, 255, 255, 0.9)' 
                        } 
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Timeout (ms)"
                      type="number"
                      value={options.timeout || 30000}
                      onChange={(e) => setOptions({...options, timeout: parseInt(e.target.value)})}
                      sx={{ ...glassTextFieldSx, width: 150 }}
                    />
                    <TextField
                      label="Wait Time (ms)"
                      type="number"
                      value={options.waitFor || 1000}
                      onChange={(e) => setOptions({...options, waitFor: parseInt(e.target.value)})}
                      sx={{ ...glassTextFieldSx, width: 150 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Card sx={glassCardSx}>
              <CardHeader
                title="Corpus Options"
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
                  <FormControlLabel
                    control={
                      <Switch
                        checked={createCorpus}
                        onChange={(e) => setCreateCorpus(e.target.checked)}
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
                    label="Create Corpus from Results"
                    sx={{ 
                      '& .MuiFormControlLabel-label': { 
                        color: 'rgba(255, 255, 255, 0.9)' 
                      } 
                    }}
                  />
                  
                  {createCorpus && (
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        label="Corpus Name (Optional)"
                        value={corpusName}
                        onChange={(e) => setCorpusName(e.target.value)}
                        helperText="Leave blank to use batch name"
                        sx={glassTextFieldSx}
                      />
                      
                      <TextField
                        fullWidth
                        label="Corpus Description (Optional)"
                        value={corpusDescription}
                        onChange={(e) => setCorpusDescription(e.target.value)}
                        multiline
                        rows={2}
                        sx={glassTextFieldSx}
                      />
                      
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
                          Corpus Tags
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <TextField
                            label="Add Tag"
                            value={corpusTag}
                            onChange={(e) => setCorpusTag(e.target.value)}
                            size="small"
                            sx={glassTextFieldSx}
                          />
                          <Button 
                            variant="outlined" 
                            onClick={addCorpusTag}
                            disabled={corpusTag.trim() === ''}
                            sx={{
                              ...glassButtonSx,
                              background: 'transparent',
                              color: 'rgba(168, 85, 247, 0.8)',
                              '&:hover': {
                                background: 'rgba(168, 85, 247, 0.1)',
                                color: 'rgba(168, 85, 247, 1)',
                              }
                            }}
                          >
                            Add
                          </Button>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {corpusTags.map((tag) => (
                            <Chip 
                              key={tag} 
                              label={tag} 
                              onDelete={() => removeCorpusTag(tag)}
                              size="small"
                              sx={{
                                background: 'rgba(168, 85, 247, 0.2)',
                                color: 'white',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                '& .MuiChip-deleteIcon': {
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  '&:hover': {
                                    color: 'white'
                                  }
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Card sx={glassCardSx}>
              <CardContent>
                <Stack spacing={3}>
                  {error && (
                    <Alert 
                      severity="error"
                      sx={{
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

                  {success && (
                    <Alert 
                      severity="success"
                      sx={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: 'white',
                        '& .MuiAlert-icon': {
                          color: 'rgba(34, 197, 94, 0.8)'
                        }
                      }}
                    >
                      {success}
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    onClick={createBatch}
                    disabled={loading}
                    startIcon={<PlayArrow />}
                    size="large"
                    fullWidth
                    sx={{
                      ...glassButtonSx,
                      py: 1.5,
                      fontSize: '1.1rem'
                    }}
                  >
                    {loading ? 'Creating Batch...' : 'Create Batch'}
                  </Button>

                  {loading && (
                    <LinearProgress 
                      sx={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #a855f7, #9333ea)'
                        }
                      }}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>

          {/* Active Batches Section */}
          {activeBatches.length > 0 && (
            <Box sx={{ width: '100%', maxWidth: 800 }}>
              <Card sx={glassCardSx}>
                <CardHeader 
                  title="Active Batches"
                  sx={{ 
                    '& .MuiCardHeader-title': { 
                      color: 'white', 
                      fontWeight: 600,
                      fontSize: '1.25rem'
                    }
                  }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <List sx={{ p: 0 }}>
                    {activeBatches.map((batch, index) => (
                      <React.Fragment key={batch.id}>
                        <ListItem sx={{ 
                          px: 0,
                          background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          borderRadius: '8px',
                          mb: 1
                        }}>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                                {batch.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label={batch.status} 
                                  color={getStatusColor(batch.status) as any}
                                  size="small"
                                  sx={{
                                    background: `rgba(${getStatusColor(batch.status) === 'success' ? '34, 197, 94' : 
                                                     getStatusColor(batch.status) === 'error' ? '239, 68, 68' :
                                                     getStatusColor(batch.status) === 'info' ? '59, 130, 246' :
                                                     '168, 85, 247'}, 0.2)`,
                                    color: 'white',
                                    border: `1px solid rgba(${getStatusColor(batch.status) === 'success' ? '34, 197, 94' : 
                                                             getStatusColor(batch.status) === 'error' ? '239, 68, 68' :
                                                             getStatusColor(batch.status) === 'info' ? '59, 130, 246' :
                                                             '168, 85, 247'}, 0.3)`
                                  }}
                                />
                                {batch.status === 'processing' && (
                                  <Button 
                                    size="small" 
                                    onClick={() => cancelBatch(batch.id)}
                                    sx={{
                                      ...glassButtonSx,
                                      background: 'transparent',
                                      color: 'rgba(245, 158, 11, 0.8)',
                                      minWidth: 'auto',
                                      px: 2,
                                      '&:hover': {
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        color: 'rgba(245, 158, 11, 1)',
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                                <Button 
                                  size="small" 
                                  onClick={() => deleteBatch(batch.id)}
                                  sx={{
                                    ...glassButtonSx,
                                    background: 'transparent',
                                    color: 'rgba(239, 68, 68, 0.8)',
                                    minWidth: 'auto',
                                    px: 2,
                                    '&:hover': {
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: 'rgba(239, 68, 68, 1)',
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </Box>
                            
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {batch.progress.completed} completed, {batch.progress.failed} failed, {batch.progress.pending} pending of {batch.progress.total} total
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={getProgressPercentage(batch.progress)}
                                sx={{ 
                                  mt: 1,
                                  background: 'rgba(168, 85, 247, 0.2)',
                                  '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #a855f7, #9333ea)'
                                  }
                                }}
                              />
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                Created: {new Date(batch.createdAt).toLocaleString()}
                              </Typography>
                              
                              {batch.corpusId && (
                                <Chip
                                  label={`Corpus: ${batch.corpusId}`}
                                  size="small"
                                  onClick={() => {
                                    // Navigate to corpus view
                                    window.location.href = `/#/corpus?id=${batch.corpusId}`;
                                  }}
                                  sx={{
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      background: 'rgba(168, 85, 247, 0.3)'
                                    }
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </ListItem>
                        {index < activeBatches.length - 1 && (
                          <Divider sx={{ 
                            borderColor: 'rgba(168, 85, 247, 0.2)',
                            mb: 1
                          }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default MassScraperForm;
