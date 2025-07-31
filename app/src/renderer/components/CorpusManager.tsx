import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
} from '@mui/material';

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
  DataObject as DataObjectIcon,
  CloudDownload as CloudDownloadIcon,
  Search as SearchIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`corpus-tabpanel-${index}`}
      aria-labelledby={`corpus-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Corpus {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  sourceId: string;
  sourceType: 'mass-scrape' | 'dive' | 'mixed';
  tags: string[];
  statistics: {
    totalDocuments: number;
    totalImages: number;
    totalLinks: number;
    totalSize: number;
  };
}

interface CorpusContent {
  documents: Array<{ id: string; title: string; url: string; contentPath: string; size: number; }>;
  images: Array<{ id: string; url: string; imagePath: string; size: number; }>;
  sitemaps?: Array<{ id: string; url: string; mapPath: string; }>;
}

interface CorpusStatistics {
  totalDocuments: number;
  totalImages: number;
  totalLinks: number;
  totalSize: number;
  contentTypes: string[];
  averageDocSize: number;
  siteMaps: number;
}

const CorpusManager: React.FC = () => {
  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Corpus state
  const [corpuses, setCorpuses] = useState<Corpus[]>([]);
  const [selectedCorpus, setSelectedCorpus] = useState<Corpus | null>(null);
  const [corpusContents, setCorpusContents] = useState<CorpusContent | null>(null);
  const [corpusStatistics, setCorpusStatistics] = useState<CorpusStatistics | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Form state
  const [newCorpusName, setNewCorpusName] = useState('');
  const [newCorpusDesc, setNewCorpusDesc] = useState('');
  const [newCorpusSourceType, setNewCorpusSourceType] = useState<'mass-scrape' | 'dive' | 'mixed'>('mass-scrape');
  const [newCorpusSourceId, setNewCorpusSourceId] = useState('');
  const [newCorpusTags, setNewCorpusTags] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  // Load corpuses on mount
  useEffect(() => {
    console.log('CorpusManager component mounted');
    loadCorpuses();
    
    // Debug component rendering
    try {
      console.log('Current state:', { 
        tabValue, 
        corpusCount: corpuses.length,
        loading,
        error: error || 'none'
      });
    } catch (err) {
      console.error('Error in debugging code:', err);
    }
  }, []);

  const loadCorpuses = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First try to check if API is running
      try {
        console.log('Checking API availability...');
        const healthCheck = await fetch('http://localhost:3001/health', { method: 'GET' });
        if (!healthCheck.ok) {
          throw new Error(`API health check failed: ${healthCheck.status}`);
        }
      } catch (healthError) {
        console.warn('API health check failed, may be unavailable:', healthError);
      }
      
      const response = await fetch('http://localhost:3001/api/corpus');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Ensure data structure is valid and has expected properties
          const corpusList = (data.data || []).map((corpus: any) => ({
            id: corpus.id || `temp-${Math.random().toString(36).substring(7)}`,
            name: corpus.name || 'Unnamed Corpus',
            description: corpus.description || '',
            createdAt: new Date(corpus.createdAt || Date.now()),
            updatedAt: new Date(corpus.updatedAt || Date.now()),
            sourceId: corpus.sourceId || '',
            sourceType: corpus.sourceType || 'mixed',
            tags: Array.isArray(corpus.tags) ? corpus.tags : [],
            statistics: {
              totalDocuments: corpus.statistics?.totalDocuments || 0,
              totalImages: corpus.statistics?.totalImages || 0,
              totalLinks: corpus.statistics?.totalLinks || 0,
              totalSize: corpus.statistics?.totalSize || 0
            }
          }));
          
          setCorpuses(corpusList);
        } else {
          setError(data.error || 'Failed to load corpuses');
        }
      } else {
        setError(`Failed to fetch corpuses (Status: ${response.status})`);
      }
    } catch (error) {
      setError('Network error - please check if the API server is running');
      console.error('Error loading corpuses:', error);
      
      // Mock data for development
      setCorpuses([
        {
          id: 'corpus-1',
          name: 'Sample Corpus',
          description: 'This is a sample corpus',
          createdAt: new Date(),
          updatedAt: new Date(),
          sourceId: 'batch-1',
          sourceType: 'mass-scrape',
          tags: ['sample', 'demo'],
          statistics: {
            totalDocuments: 25,
            totalImages: 15,
            totalLinks: 40,
            totalSize: 1024000
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCorpusDetails = async (corpusId: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`http://localhost:3001/api/corpus/${corpusId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const corpus = {
            ...data.data,
            createdAt: new Date(data.data.createdAt),
            updatedAt: new Date(data.data.updatedAt)
          };
          
          setSelectedCorpus(corpus);
          setCorpusContents(data.data.contents);
          setDetailsDialogOpen(true);
          
          // Also fetch statistics
          fetchCorpusStatistics(corpusId);
        } else {
          setError(data.error || 'Failed to load corpus details');
        }
      } else {
        setError(`Failed to fetch corpus details (Status: ${response.status})`);
      }
    } catch (error) {
      setError('Network error loading corpus details');
      console.error('Error loading corpus details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorpusStatistics = async (corpusId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/corpus/${corpusId}/statistics`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setCorpusStatistics(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching corpus statistics:', error);
    }
  };

  const createNewCorpus = async () => {
    if (!newCorpusName || !newCorpusSourceId || !newCorpusSourceType) {
      setError('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/corpus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCorpusName,
          description: newCorpusDesc,
          sourceId: newCorpusSourceId,
          sourceType: newCorpusSourceType,
          tags: newCorpusTags.split(',').map(tag => tag.trim()).filter(Boolean)
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Reset form
          setNewCorpusName('');
          setNewCorpusDesc('');
          setNewCorpusSourceId('');
          setNewCorpusSourceType('mass-scrape');
          setNewCorpusTags('');
          
          // Close dialog
          setCreateDialogOpen(false);
          
          // Reload corpuses
          loadCorpuses();
        } else {
          setError(data.error || 'Failed to create corpus');
        }
      } else {
        setError(`Failed to create corpus (Status: ${response.status})`);
      }
    } catch (error) {
      setError('Network error creating corpus');
      console.error('Error creating corpus:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCorpus = async (corpusId: string) => {
    if (!confirm('Are you sure you want to delete this corpus? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`http://localhost:3001/api/corpus/${corpusId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from local state
        setCorpuses(prevCorpuses => prevCorpuses.filter(corpus => corpus.id !== corpusId));
      } else {
        setError(`Failed to delete corpus (Status: ${response.status})`);
      }
    } catch (error) {
      setError('Network error deleting corpus');
      console.error('Error deleting corpus:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCorpus = async (corpusId: string, format: 'json' | 'csv' | 'full') => {
    try {
      const response = await fetch(`http://localhost:3001/api/corpus/${corpusId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `corpus-${corpusId}.${format === 'full' ? 'zip' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(`Failed to export corpus (Status: ${response.status})`);
      }
    } catch (error) {
      setError('Network error exporting corpus');
      console.error('Error exporting corpus:', error);
    }
  };

  const [massBatchId, setMassBatchId] = useState('');
  const [massBatchName, setMassBatchName] = useState('');
  const [massBatchDescription, setMassBatchDescription] = useState('');
  const [massBatchTags, setMassBatchTags] = useState<string[]>([]);
  const [massBatchTag, setMassBatchTag] = useState('');

  const createCorpusFromMassScrape = async () => {
    if (!massBatchId) {
      setError('Please enter a batch ID');
      return;
    }

    // Ensure batchId includes "batch-" prefix
    const batchIdParam = massBatchId.startsWith('batch-') ? massBatchId : `batch-${massBatchId}`;
    setLoading(true);
    setError('');
    
    try {
      // Use corrected batchIdParam for the endpoint
      const url = `http://localhost:3001/api/corpus/from-batch/${batchIdParam}`;
      console.log(`Creating corpus from batch, fetching: ${url}`);
     
      const response = await fetch(url, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           corpusName: massBatchName || `Corpus from batch ${massBatchId}`,
           corpusDescription: massBatchDescription || `Content from mass scrape batch ${massBatchId}`,
           corpusTags: massBatchTags.length > 0 ? massBatchTags : ['mass-scrape', 'auto-generated']
         })
       });

       const result = await response.json();

       if (result.success) {
         // Reset form
         setMassBatchId('');
         setMassBatchName('');
         setMassBatchDescription('');
         setMassBatchTags([]);
         setMassBatchTag('');
         
         // Reload corpus list
         loadCorpuses();
         
         // Show success message
         alert(`Corpus created successfully from batch ${batchIdParam} with ID: ${result.data.corpusId}`);
       } else {
         setError(result.error || 'Failed to create corpus');
       }
     } catch (error) {
       console.error('Error creating corpus from batch:', error);
       setError('Network error creating corpus');
     } finally {
       setLoading(false);
     }
   };
  
  const addMassBatchTag = () => {
    if (massBatchTag && !massBatchTags.includes(massBatchTag)) {
      setMassBatchTags([...massBatchTags, massBatchTag]);
      setMassBatchTag('');
    }
  };
  
  const removeMassBatchTag = (tag: string) => {
    setMassBatchTags(massBatchTags.filter(t => t !== tag));
  };

  const createCorpusFromDive = async () => {
    // Implementation will be added
    alert('Creating corpus from dive - not yet implemented');
  };
  
  // Calculate pagination
  const paginatedCorpuses = corpuses.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Additional check for required data
  if (paginatedCorpuses && !Array.isArray(paginatedCorpuses)) {
    console.error('paginatedCorpuses is not an array:', paginatedCorpuses);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          An error occurred while loading corpus data. Please refresh the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Results Corpus Manager</Typography>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => setCreateDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              New Corpus
            </Button>
            <Button 
              variant="outlined"
              onClick={() => loadCorpuses()}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Corpus List" icon={<StorageIcon />} />
          <Tab label="Quick Create" icon={<AddIcon />} />
        </Tabs>

        {/* Corpus List Tab */}
        <TabPanel value={tabValue} index={0}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {paginatedCorpuses.map((corpus) => (
                  <Grid item xs={12} md={6} lg={4} key={corpus.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {corpus.name}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {corpus.description || 'No description'}
                        </Typography>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Grid container spacing={1} sx={{ mb: 1 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Source Type
                            </Typography>
                            <Typography variant="body2">
                              {corpus.sourceType === 'mass-scrape' 
                                ? 'Mass Scrape' 
                                : corpus.sourceType === 'dive' 
                                  ? 'Site Dive' 
                                  : 'Mixed'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Created
                            </Typography>
                            <Typography variant="body2">
                              {corpus.createdAt.toLocaleDateString()}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Documents
                            </Typography>
                            <Typography variant="body2">
                              {corpus.statistics.totalDocuments}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Images
                            </Typography>
                            <Typography variant="body2">
                              {corpus.statistics.totalImages}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box sx={{ mb: 1 }}>
                          {corpus.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </Box>
                      </CardContent>
                      
                      <CardActions>
                        <Button 
                          size="small" 
                          startIcon={<SearchIcon />} 
                          onClick={() => loadCorpusDetails(corpus.id)}
                        >
                          Details
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<DownloadIcon />}
                          onClick={() => exportCorpus(corpus.id, 'json')}
                        >
                          Export
                        </Button>
                        <Box flexGrow={1} />
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => deleteCorpus(corpus.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {corpuses.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No corpuses found. Create a new one to get started.
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ mt: 2 }}
                  >
                    Create Corpus
                  </Button>
                </Box>
              )}
              
              {/* Pagination */}
              {corpuses.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={Math.ceil(corpuses.length / itemsPerPage)}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        {/* Quick Create Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Create from Mass Scrape Job
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Create a new corpus from an existing mass scrape job. 
                    This will automatically link all content from the job.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Mass Scrape Job ID"
                    variant="outlined"
                    margin="normal"
                    placeholder="Enter batch ID"
                    value={massBatchId}
                    onChange={(e) => setMassBatchId(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Corpus Name (Optional)"
                    variant="outlined"
                    margin="normal"
                    placeholder="Leave blank to use default"
                    value={massBatchName}
                    onChange={(e) => setMassBatchName(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Description (Optional)"
                    variant="outlined"
                    margin="normal"
                    multiline
                    rows={2}
                    placeholder="Enter corpus description"
                    value={massBatchDescription}
                    onChange={(e) => setMassBatchDescription(e.target.value)}
                  />
                  
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    Tags
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label="Add Tag"
                      size="small"
                      value={massBatchTag}
                      onChange={(e) => setMassBatchTag(e.target.value)}
                    />
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={addMassBatchTag}
                      disabled={!massBatchTag}
                    >
                      Add
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {massBatchTags.map((tag) => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        onDelete={() => removeMassBatchTag(tag)}
                        size="small"
                      />
                    ))}
                    {massBatchTags.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Default tags: mass-scrape, auto-generated
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained" 
                    onClick={createCorpusFromMassScrape}
                    startIcon={<AddIcon />}
                    disabled={!massBatchId || loading}
                  >
                    Create Corpus
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Create from Dive
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Create a new corpus from an existing dive job. 
                    If the dive led to a mass scrape, you can include that content as well.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Dive Job ID"
                    variant="outlined"
                    margin="normal"
                    placeholder="Enter dive ID"
                  />
                  <TextField
                    fullWidth
                    label="Related Mass Scrape Job ID (optional)"
                    variant="outlined"
                    margin="normal"
                    placeholder="Enter batch ID if applicable"
                  />
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained" 
                    onClick={createCorpusFromDive}
                    startIcon={<AddIcon />}
                  >
                    Create Corpus
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Corpus</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Corpus Name"
            variant="outlined"
            margin="normal"
            value={newCorpusName}
            onChange={(e) => setNewCorpusName(e.target.value)}
            required
          />
          
          <TextField
            fullWidth
            label="Description"
            variant="outlined"
            margin="normal"
            value={newCorpusDesc}
            onChange={(e) => setNewCorpusDesc(e.target.value)}
            multiline
            rows={2}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Source Type</InputLabel>
            <Select
              value={newCorpusSourceType}
              onChange={(e) => setNewCorpusSourceType(e.target.value as 'mass-scrape' | 'dive' | 'mixed')}
            >
              <MenuItem value="mass-scrape">Mass Scrape</MenuItem>
              <MenuItem value="dive">Site Dive</MenuItem>
              <MenuItem value="mixed">Mixed</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Source ID"
            variant="outlined"
            margin="normal"
            value={newCorpusSourceId}
            onChange={(e) => setNewCorpusSourceId(e.target.value)}
            required
            placeholder={
              newCorpusSourceType === 'mass-scrape' 
                ? 'Enter batch ID' 
                : newCorpusSourceType === 'dive' 
                  ? 'Enter dive ID' 
                  : 'Enter primary source ID'
            }
          />
          
          <TextField
            fullWidth
            label="Tags"
            variant="outlined"
            margin="normal"
            value={newCorpusTags}
            onChange={(e) => setNewCorpusTags(e.target.value)}
            placeholder="Enter tags separated by commas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={createNewCorpus}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedCorpus && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {selectedCorpus.name}
                </Typography>
                <Chip
                  icon={<StorageIcon />}
                  label={selectedCorpus.sourceType === 'mass-scrape' 
                    ? 'Mass Scrape' 
                    : selectedCorpus.sourceType === 'dive' 
                      ? 'Site Dive' 
                      : 'Mixed'}
                  color="primary"
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedCorpus.description || 'No description'}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Source Information
              </Typography>
              <Typography variant="body2" paragraph>
                Source ID: {selectedCorpus.sourceId}
              </Typography>
              
              {selectedCorpus.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags
                  </Typography>
                  {selectedCorpus.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Contents
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DocumentIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Documents</Typography>
                      </Box>
                      <Typography variant="h4" color="primary">
                        {selectedCorpus.statistics.totalDocuments}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <ImageIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Images</Typography>
                      </Box>
                      <Typography variant="h4" color="primary">
                        {selectedCorpus.statistics.totalImages}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DataObjectIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Total Size</Typography>
                      </Box>
                      <Typography variant="h4" color="primary">
                        {formatFileSize(selectedCorpus.statistics.totalSize)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {corpusStatistics && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Average Document Size</TableCell>
                          <TableCell>{formatFileSize(corpusStatistics.averageDocSize)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Content Types</TableCell>
                          <TableCell>
                            {corpusStatistics.contentTypes.map(type => (
                              <Chip key={type} label={type} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Sitemaps</TableCell>
                          <TableCell>{corpusStatistics.siteMaps}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              
              {corpusContents && (
                <>
                  {corpusContents.documents.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Documents ({corpusContents.documents.length})
                      </Typography>
                      <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                        <List dense>
                          {corpusContents.documents.slice(0, 10).map((doc) => (
                            <ListItem key={doc.id}>
                              <ListItemIcon>
                                <DocumentIcon />
                              </ListItemIcon>
                              <ListItemText 
                                primary={doc.title} 
                                secondary={doc.url} 
                                secondaryTypographyProps={{ style: { fontSize: '0.75rem' } }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(doc.size)}
                              </Typography>
                            </ListItem>
                          ))}
                          {corpusContents.documents.length > 10 && (
                            <ListItem>
                              <ListItemText 
                                primary={`... and ${corpusContents.documents.length - 10} more documents`} 
                                primaryTypographyProps={{ style: { fontStyle: 'italic', textAlign: 'center' } }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Paper>
                    </Box>
                  )}
                  
                  {corpusContents.images && corpusContents.images.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Images ({corpusContents.images.length})
                      </Typography>
                      <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                        <List dense>
                          {corpusContents.images.slice(0, 10).map((img) => (
                            <ListItem key={img.id}>
                              <ListItemIcon>
                                <ImageIcon />
                              </ListItemIcon>
                              <ListItemText 
                                primary={img.url.split('/').pop()} 
                                secondary={img.url} 
                                secondaryTypographyProps={{ style: { fontSize: '0.75rem' } }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(img.size)}
                              </Typography>
                            </ListItem>
                          ))}
                          {corpusContents.images.length > 10 && (
                            <ListItem>
                              <ListItemText 
                                primary={`... and ${corpusContents.images.length - 10} more images`} 
                                primaryTypographyProps={{ style: { fontStyle: 'italic', textAlign: 'center' } }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Paper>
                    </Box>
                  )}
                  
                  {corpusContents.sitemaps && corpusContents.sitemaps.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Sitemaps ({corpusContents.sitemaps.length})
                      </Typography>
                      <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                        <List dense>
                          {corpusContents.sitemaps.map((sitemap) => (
                            <ListItem key={sitemap.id}>
                              <ListItemIcon>
                                <LanguageIcon />
                              </ListItemIcon>
                              <ListItemText 
                                primary={sitemap.url} 
                                secondary={sitemap.mapPath} 
                                secondaryTypographyProps={{ style: { fontSize: '0.75rem' } }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Box>
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
              <Box flexGrow={1} />
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={() => exportCorpus(selectedCorpus.id, 'csv')}
              >
                Export CSV
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={() => exportCorpus(selectedCorpus.id, 'json')}
              >
                Export JSON
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<CloudDownloadIcon />}
                onClick={() => exportCorpus(selectedCorpus.id, 'full')}
              >
                Full Export
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CorpusManager;
