import React, { useState } from 'react';
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
  Divider
} from '@mui/material';
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
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader
          title="Mass Scraper"
          subheader="Create batch jobs to scrape multiple URLs simultaneously"
        />
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Batch Name (Optional)"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              margin="normal"
              helperText="Give your batch a descriptive name"
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            URLs to Scrape
            <Button 
              size="small" 
              onClick={clearAllUrls}
              startIcon={<Clear />}
              sx={{ ml: 2 }}
            >
              Clear All
            </Button>
          </Typography>

          {urls.map((url, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
              />
              <IconButton 
                onClick={() => removeUrlField(index)}
                disabled={urls.length === 1}
                color="error"
              >
                <Delete />
              </IconButton>
            </Box>
          ))}

          <Button
            startIcon={<Add />}
            onClick={addUrlField}
            sx={{ mb: 3 }}
          >
            Add URL
          </Button>

          <Typography variant="h6" gutterBottom>
            Scrape Options
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.screenshot || false}
                  onChange={(e) => setOptions({...options, screenshot: e.target.checked})}
                />
              }
              label="Take Screenshots"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={options.fullPage || false}
                  onChange={(e) => setOptions({...options, fullPage: e.target.checked})}
                />
              }
              label="Full Page Screenshot"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Timeout (ms)"
              type="number"
              value={options.timeout || 30000}
              onChange={(e) => setOptions({...options, timeout: parseInt(e.target.value)})}
              sx={{ width: 150 }}
            />
            <TextField
              label="Wait Time (ms)"
              type="number"
              value={options.waitFor || 1000}
              onChange={(e) => setOptions({...options, waitFor: parseInt(e.target.value)})}
              sx={{ width: 150 }}
            />
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
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
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Corpus Name (Optional)"
                value={corpusName}
                onChange={(e) => setCorpusName(e.target.value)}
                margin="normal"
                helperText="Leave blank to use batch name"
              />
              
              <TextField
                fullWidth
                label="Corpus Description (Optional)"
                value={corpusDescription}
                onChange={(e) => setCorpusDescription(e.target.value)}
                margin="normal"
                multiline
                rows={2}
              />
              
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Corpus Tags
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="Add Tag"
                    value={corpusTag}
                    onChange={(e) => setCorpusTag(e.target.value)}
                    size="small"
                  />
                  <Button 
                    variant="outlined" 
                    onClick={addCorpusTag}
                    disabled={corpusTag.trim() === ''}
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
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
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
            sx={{ mb: 3 }}
          >
            {loading ? 'Creating Batch...' : 'Create Batch'}
          </Button>

          {loading && <LinearProgress sx={{ mb: 2 }} />}
        </CardContent>
      </Card>

      {/* Active Batches Section */}
      {activeBatches.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardHeader title="Active Batches" />
          <CardContent>
            <List>
              {activeBatches.map((batch, index) => (
                <React.Fragment key={batch.id}>
                  <ListItem>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">
                          {batch.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            label={batch.status} 
                            color={getStatusColor(batch.status) as any}
                            size="small"
                          />
                          {batch.status === 'processing' && (
                            <Button 
                              size="small" 
                              onClick={() => cancelBatch(batch.id)}
                              color="warning"
                            >
                              Cancel
                            </Button>
                          )}
                          <Button 
                            size="small" 
                            onClick={() => deleteBatch(batch.id)}
                            color="error"
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {batch.progress.completed} completed, {batch.progress.failed} failed, {batch.progress.pending} pending of {batch.progress.total} total
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={getProgressPercentage(batch.progress)}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(batch.createdAt).toLocaleString()}
                        </Typography>
                        
                        {batch.corpusId && (
                          <Chip
                            label={`Corpus: ${batch.corpusId}`}
                            color="primary"
                            size="small"
                            onClick={() => {
                              // Navigate to corpus view
                              window.location.href = `/#/corpus?id=${batch.corpusId}`;
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                  {index < activeBatches.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MassScraperForm;
