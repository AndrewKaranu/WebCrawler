import React, { useState, useEffect } from 'react';
import '../styles/glassmorphic.css';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
  Stack,
  CardHeader
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Delete,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  TravelExplore,
  Preview,
  Web
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Job {
  id: string;
  name: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress?: {
    processed?: number;
    queued?: number;
    visited?: number;
    status?: string;
    domain?: string;
    baseUrl?: string;
  };
  result?: any;
  failedReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobsListProps {
  onJobSelect?: (job: Job) => void;
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

const JobsList: React.FC<JobsListProps> = ({ onJobSelect }) => {
  const [jobs, setJobs] = useState<{
    waiting: Job[];
    active: Job[];
    completed: Job[];
  }>({ waiting: [], active: [], completed: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/jobs');
      const result = await response.json();
      
      if (result.success) {
        setJobs(result.data);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchJobs(); // Refresh the list
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getJobIcon = (jobName: string, state: string) => {
    if (state === 'completed') return <CheckCircle color="success" />;
    if (state === 'failed') return <ErrorIcon color="error" />;
    if (state === 'active') return <PlayArrow color="primary" />;
    
    switch (jobName) {
      case 'diveFull': return <TravelExplore />;
      case 'divePreview': return <Preview />;
      case 'scrapePage': return <Web />;
      default: return <Schedule />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'waiting': return 'default';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const formatJobName = (name: string) => {
    switch (name) {
      case 'diveFull': return 'Full Dive';
      case 'divePreview': return 'Preview Dive';
      case 'scrapePage': return 'Page Scrape';
      default: return name;
    }
  };

  const showJobDetails = (job: Job) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  const handleJobSelect = (job: Job) => {
    if (onJobSelect) {
      onJobSelect(job);
    }
    showJobDetails(job);
  };

  useEffect(() => {
    fetchJobs();
    
    // Auto-refresh every 3 seconds for active jobs
    const interval = setInterval(() => {
      if (jobs.active.length > 0) {
        fetchJobs();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [jobs.active.length]);

  const renderJobSection = (title: string, jobList: Job[], color: 'primary' | 'warning' | 'success') => (
    <Card sx={glassCardSx}>
      <CardHeader 
        title={`${title} (${jobList.length})`}
        sx={{ 
          '& .MuiCardHeader-title': { 
            color: 'white', 
            fontWeight: 600,
            fontSize: '1.25rem'
          }
        }}
      />
      <CardContent sx={{ pt: 0 }}>
        {jobList.length === 0 ? (
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 2 }}>
            No {title.toLowerCase()} jobs
          </Typography>
        ) : (
          <Stack spacing={2}>
            {jobList.map((job) => (
              <Card key={job.id} sx={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(168, 85, 247, 0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(5px)'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ color: 'rgba(168, 85, 247, 0.8)' }}>
                      {getJobIcon(job.name, job.state)}
                    </Box>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, flex: 1 }}>
                      {formatJobName(job.name)}
                    </Typography>
                    <Chip 
                      label={job.state} 
                      size="small" 
                      sx={{
                        background: `rgba(${getStateColor(job.state) === 'success' ? '34, 197, 94' : 
                                         getStateColor(job.state) === 'error' ? '239, 68, 68' :
                                         getStateColor(job.state) === 'primary' ? '59, 130, 246' :
                                         '168, 85, 247'}, 0.2)`,
                        color: 'white',
                        border: `1px solid rgba(${getStateColor(job.state) === 'success' ? '34, 197, 94' : 
                                                 getStateColor(job.state) === 'error' ? '239, 68, 68' :
                                                 getStateColor(job.state) === 'primary' ? '59, 130, 246' :
                                                 '168, 85, 247'}, 0.3)`
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    ID: {job.id}
                  </Typography>
                  
                  {job.progress?.status && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
                      Status: {job.progress.status}
                    </Typography>
                  )}
                  
                  {job.progress && (job.progress.processed !== undefined || job.progress.visited !== undefined) && (
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Progress: {job.progress.processed || 0} processed, {job.progress.visited || 0} visited
                      </Typography>
                      {job.state === 'active' && (
                        <LinearProgress 
                          sx={{ 
                            mt: 1,
                            background: 'rgba(168, 85, 247, 0.2)',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(90deg, #a855f7, #9333ea)'
                            }
                          }}
                        />
                      )}
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <IconButton 
                      onClick={() => handleJobSelect(job)}
                      sx={{ 
                        color: 'rgba(168, 85, 247, 0.8)',
                        '&:hover': {
                          color: 'rgba(168, 85, 247, 1)',
                          background: 'rgba(168, 85, 247, 0.1)'
                        }
                      }}
                    >
                      <Preview />
                    </IconButton>
                    <IconButton 
                      onClick={() => deleteJob(job.id)}
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
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 800 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent'
              }}
            >
              Jobs Queue
            </Typography>
            <Button 
              startIcon={<Refresh />}
              onClick={fetchJobs}
              disabled={loading}
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
              Refresh
            </Button>
          </Box>

          {error && (
            <Alert 
              severity="error"
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

          {loading && (
            <LinearProgress 
              sx={{
                width: '100%',
                maxWidth: 800,
                background: 'rgba(168, 85, 247, 0.2)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #a855f7, #9333ea)'
                }
              }}
            />
          )}

          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Stack spacing={3}>
              {renderJobSection('Active', jobs.active, 'primary')}
              {renderJobSection('Waiting', jobs.waiting, 'warning')}
              {renderJobSection('Completed', jobs.completed, 'success')}
            </Stack>
          </Box>
        </Stack>
      </Container>

      {/* Job Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            ...glassCardSx,
            maxWidth: '800px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 600 }}>
          Job Details: {selectedJob && formatJobName(selectedJob.name)}
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>ID:</strong> {selectedJob.id}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>State:</strong> {selectedJob.state}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>Created:</strong> {new Date(selectedJob.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>Updated:</strong> {new Date(selectedJob.updatedAt).toLocaleString()}
              </Typography>
              
              {selectedJob.progress && (
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>Progress</Typography>
                  <Box sx={{ 
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(168, 85, 247, 0.1)',
                    borderRadius: '8px',
                    p: 2
                  }}>
                    <pre style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      margin: 0, 
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}>
                      {JSON.stringify(selectedJob.progress, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
              
              {selectedJob.result && (
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>Result</Typography>
                  <Box sx={{ 
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(168, 85, 247, 0.1)',
                    borderRadius: '8px',
                    p: 2
                  }}>
                    <pre style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      margin: 0, 
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}>
                      {JSON.stringify(selectedJob.result, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
              
              {selectedJob.failedReason && (
                <Box>
                  <Typography variant="h6" sx={{ color: 'rgba(239, 68, 68, 0.8)', mb: 1 }}>Error</Typography>
                  <Typography sx={{ color: 'rgba(239, 68, 68, 0.9)' }}>
                    {selectedJob.failedReason}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDetailsOpen(false)}
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
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobsList;
