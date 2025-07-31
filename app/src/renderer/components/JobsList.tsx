import React, { useState, useEffect } from 'react';
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
  AccordionDetails
} from '@mui/material';
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
    <Accordion defaultExpanded={jobList.length > 0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          {title} ({jobList.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {jobList.length === 0 ? (
          <Typography color="textSecondary">No {title.toLowerCase()} jobs</Typography>
        ) : (
          <List>
            {jobList.map((job) => (
              <Card key={job.id} sx={{ mb: 1 }}>
                <ListItem>
                  <ListItemIcon>
                    {getJobIcon(job.name, job.state)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {formatJobName(job.name)}
                        </Typography>
                        <Chip 
                          label={job.state} 
                          size="small" 
                          color={getStateColor(job.state) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          ID: {job.id}
                        </Typography>
                        {job.progress?.status && (
                          <Typography variant="body2">
                            Status: {job.progress.status}
                          </Typography>
                        )}
                        {job.progress && (job.progress.processed !== undefined || job.progress.visited !== undefined) && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              Progress: {job.progress.processed || 0} processed, {job.progress.visited || 0} visited
                            </Typography>
                            {job.state === 'active' && (
                              <LinearProgress 
                                sx={{ mt: 0.5 }}
                                variant="indeterminate"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <Box>
                    <IconButton onClick={() => handleJobSelect(job)}>
                      <Preview />
                    </IconButton>
                    <IconButton 
                      onClick={() => deleteJob(job.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItem>
              </Card>
            ))}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Jobs Queue</Typography>
        <Button 
          variant="outlined" 
          startIcon={<Refresh />}
          onClick={fetchJobs}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {renderJobSection('Active', jobs.active, 'primary')}
      {renderJobSection('Waiting', jobs.waiting, 'warning')}
      {renderJobSection('Completed', jobs.completed, 'success')}

      {/* Job Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Job Details: {selectedJob && formatJobName(selectedJob.name)}
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>ID:</strong> {selectedJob.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>State:</strong> {selectedJob.state}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Created:</strong> {new Date(selectedJob.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Updated:</strong> {new Date(selectedJob.updatedAt).toLocaleString()}
              </Typography>
              
              {selectedJob.progress && (
                <Box mt={2}>
                  <Typography variant="h6">Progress</Typography>
                  <pre>{JSON.stringify(selectedJob.progress, null, 2)}</pre>
                </Box>
              )}
              
              {selectedJob.result && (
                <Box mt={2}>
                  <Typography variant="h6">Result</Typography>
                  <pre>{JSON.stringify(selectedJob.result, null, 2)}</pre>
                </Box>
              )}
              
              {selectedJob.failedReason && (
                <Box mt={2}>
                  <Typography variant="h6" color="error">Error</Typography>
                  <Typography color="error">{selectedJob.failedReason}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobsList;
