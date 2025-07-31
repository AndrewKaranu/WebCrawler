import React, { useState } from 'react';
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
} from '@mui/material';
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
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
        🕷️ Spider Engine Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* URL Input */}
              <TextField
                label="URL to Scrape"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                fullWidth
                required
                placeholder="https://example.com"
                variant="outlined"
              />

              {/* Engine Selection */}
              <FormControl fullWidth>
                <InputLabel>Scraping Engine</InputLabel>
                <Select
                  value={engine}
                  label="Scraping Engine"
                  onChange={(e) => setEngine(e.target.value)}
                >
                  <MenuItem value="spider">🕷️ Spider (CDP)</MenuItem>
                  <MenuItem value="playwright">🎭 Playwright</MenuItem>
                  <MenuItem value="selenium">🌐 Selenium</MenuItem>
                  <MenuItem value="http">📡 HTTP</MenuItem>
                </Select>
              </FormControl>

              {/* Advanced Options */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Options</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      label="Wait for Load (ms)"
                      type="number"
                      value={advancedOptions.waitForLoad}
                      onChange={(e) => setAdvancedOptions(prev => ({
                        ...prev,
                        waitForLoad: Number(e.target.value)
                      }))}
                      size="small"
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
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedOptions.headless}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            headless: e.target.checked
                          }))}
                        />
                      }
                      label="Headless Mode"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedOptions.stealth}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            stealth: e.target.checked
                          }))}
                        />
                      }
                      label="Stealth Mode"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedOptions.bypassCache}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            bypassCache: e.target.checked
                          }))}
                        />
                      }
                      label="Bypass Cache (Force Fresh Scrape)"
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || !url}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <PlayIcon />}
                  sx={{ flex: 1 }}
                >
                  {isLoading ? 'Scraping...' : 'Start Scraping'}
                </Button>
                
                {isLoading && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleStop}
                    startIcon={<StopIcon />}
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
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Scraping Results
            </Typography>
            
            {result.success ? (
              <Stack spacing={2}>
                <Alert severity="success">
                  Successfully scraped {result.data?.url}
                </Alert>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Status: ${result.data?.statusCode}`} color="success" size="small" />
                  <Chip label={`Load Time: ${result.data?.loadTime}ms`} color="info" size="small" />
                  <Chip label={`Title: ${result.data?.title}`} color="default" size="small" />
                </Box>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>HTML Content ({result.data?.html.length} characters)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'grey.900',
                        color: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 400,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {result.data?.html}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Extracted Text ({result.data?.text?.length} characters)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      sx={{
                        backgroundColor: 'grey.100',
                        color: 'grey.900',
                        p: 2,
                        borderRadius: 1,
                        maxHeight: 300,
                        overflow: 'auto',
                      }}
                    >
                      {result.data?.text}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            ) : (
              <Alert severity="error">
                <Typography variant="subtitle2">Error occurred:</Typography>
                <Typography variant="body2">{result.error}</Typography>
              </Alert>
            )}
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Timestamp: {new Date(result.timestamp).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ScrapeForm;
