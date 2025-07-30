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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NavigationIcon from '@mui/icons-material/Navigation';
import MouseIcon from '@mui/icons-material/Mouse';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface AutomationAction {
  type: 'navigate' | 'click' | 'type' | 'fillForm' | 'smartFillForm' | 'waitForElement' | 'getText' | 'screenshotElement' | 'screenshotViewport' | 'screenshotFullPage' | 'executeScript';
  params: any;
  timestamp?: Date;
  result?: any;
  error?: string;
}

const AutomationTest: React.FC = () => {
  const [url, setUrl] = useState('https://example.com');
  const [selector, setSelector] = useState('#example-selector');
  const [text, setText] = useState('');
  const [script, setScript] = useState('document.title');
  const [formData, setFormData] = useState('{\n  "#u_Hip_4607": "John",\n  "#u_Hip_338354": "Doe",\n  "#u_Hip_4608": "john.doe@example.com",\n  "#u_Hip_338367": "Sales Inquiry",\n  "#u_Hip_4609": "I am interested in learning more about your products and services."\n}');
  const [waitForNavigation, setWaitForNavigation] = useState(false);
  const [timeout, setTimeout] = useState(10000);
  const [headlessMode, setHeadlessMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeAction = async (action: AutomationAction) => {
    setLoading(true);
    setError(null);
    
    const newAction = { ...action, timestamp: new Date() };
    
    try {
      // Handle special action types that have different URL patterns
      let endpoint = action.type.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (action.type === 'smartFillForm') {
        endpoint = 'smart-fill-form';
      }
      
      const response = await fetch(`http://localhost:3001/api/automate/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.params),
      });

      const result = await response.json();
      
      if (result.success) {
        newAction.result = result.data || result.message;
        setLastResult(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      newAction.error = errorMessage;
      setError(errorMessage);
    }
    
    setActions(prev => [...prev, newAction]);
    setLoading(false);
  };

  const toggleHeadlessMode = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/automate/set-headless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ headless: !headlessMode }),
      });

      const result = await response.json();
      
      if (result.success) {
        setHeadlessMode(!headlessMode);
        setLastResult(`Browser mode changed to: ${!headlessMode ? 'Headless' : 'Visible'}. Browser will restart with new setting.`);
      } else {
        throw new Error(result.error || 'Failed to change headless mode');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
    setLoading(false);
  };

  const restartBrowser = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/automate/restart-browser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setLastResult('Browser restarted successfully. Fresh browser session created.');
      } else {
        throw new Error(result.error || 'Failed to restart browser');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
    setLoading(false);
  };

  const handleNavigate = () => {
    executeAction({
      type: 'navigate',
      params: { url, waitUntil: 'load' }
    });
  };

  const handleClick = () => {
    executeAction({
      type: 'click',
      params: { selector, waitForNavigation }
    });
  };

  const handleType = () => {
    executeAction({
      type: 'type',
      params: { selector, text, delay: 50, clear: true }
    });
  };

  const handleFillForm = () => {
    try {
      // Validate that the string is not empty
      if (!formData.trim()) {
        setError('Form data cannot be empty');
        return;
      }

      // Try to parse the JSON
      const parsedFormData = JSON.parse(formData);
      
      // Validate that it's an object and not an array or primitive
      if (typeof parsedFormData !== 'object' || parsedFormData === null || Array.isArray(parsedFormData)) {
        setError('Form data must be a JSON object with selector-value pairs, e.g., {"#selector": "value"}');
        return;
      }

      // Validate that the object has at least one property
      if (Object.keys(parsedFormData).length === 0) {
        setError('Form data object cannot be empty. Add at least one selector-value pair.');
        return;
      }

      // Validate that all values are strings
      for (const [selector, value] of Object.entries(parsedFormData)) {
        if (typeof value !== 'string') {
          setError(`Value for selector "${selector}" must be a string. Got: ${typeof value}`);
          return;
        }
      }

      console.log('Form data validation passed:', parsedFormData);
      
      executeAction({
        type: 'fillForm',
        params: { formData: parsedFormData }
      });
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Provide more specific JSON syntax error information
        const errorMsg = err.message;
        if (errorMsg.includes('position')) {
          setError(`JSON syntax error: ${errorMsg}. Check for missing quotes, commas, or brackets.`);
        } else {
          setError(`Invalid JSON format: ${errorMsg}. Make sure to use double quotes for keys and values.`);
        }
      } else {
        setError('Invalid JSON format for form data');
      }
    }
  };

  const handleWaitForElement = () => {
    executeAction({
      type: 'waitForElement',
      params: { selector, timeout }
    });
  };

  const handleGetText = () => {
    executeAction({
      type: 'getText',
      params: { selector }
    });
  };

  const handleScreenshotElement = () => {
    executeAction({
      type: 'screenshotElement',
      params: { selector }
    });
  };

  const handleExecuteScript = () => {
    executeAction({
      type: 'executeScript',
      params: { script }
    });
  };

  const handleGetPageHTML = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/automate/page-html', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setLastResult({ html: result.html, fullLength: result.fullLength });
        setActions(prev => [...prev, {
          type: 'getText' as any,
          params: { action: 'getPageHTML' },
          timestamp: new Date(),
          result: { htmlLength: result.fullLength, preview: result.html.substring(0, 500) + '...' }
        }]);
        console.log('Page HTML retrieved. Full length:', result.fullLength);
      } else {
        throw new Error(result.error || 'Failed to get page HTML');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setActions(prev => [...prev, {
        type: 'getText' as any,
        params: { action: 'getPageHTML' },
        timestamp: new Date(),
        error: errorMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to auto-detect form fields
  const handleAutoDetectFields = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/automate/auto-detect-fields', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setLastResult(result.data);
        setActions(prev => [...prev, {
          type: 'getText' as any,
          params: { action: 'autoDetectFields' },
          timestamp: new Date(),
          result: result.data
        }]);
        
        // Map detected fields to appropriate sample values
        const detectedFields = result.data;
        const sampleData: Record<string, string> = {};
        
        // Map detected fields to appropriate sample values
        if (detectedFields.firstName) sampleData[detectedFields.firstName] = "John";
        if (detectedFields.lastName) sampleData[detectedFields.lastName] = "Doe";
        if (detectedFields.fullName) sampleData[detectedFields.fullName] = "John Doe";
        if (detectedFields.email) sampleData[detectedFields.email] = "john.doe@example.com";
        if (detectedFields.password) sampleData[detectedFields.password] = "SecurePassword123!";
        if (detectedFields.confirmPassword) sampleData[detectedFields.confirmPassword] = "SecurePassword123!";
        if (detectedFields.phone) sampleData[detectedFields.phone] = "(555) 123-4567";
        if (detectedFields.address) sampleData[detectedFields.address] = "123 Main Street";
        if (detectedFields.city) sampleData[detectedFields.city] = "New York";
        if (detectedFields.state) sampleData[detectedFields.state] = "NY";
        if (detectedFields.zipCode) sampleData[detectedFields.zipCode] = "10001";
        if (detectedFields.country) sampleData[detectedFields.country] = "United States";
        if (detectedFields.creditCardNumber) sampleData[detectedFields.creditCardNumber] = "4111111111111111";
        if (detectedFields.creditCardCVC) sampleData[detectedFields.creditCardCVC] = "123";
        if (detectedFields.creditCardExpMonth) sampleData[detectedFields.creditCardExpMonth] = "12";
        if (detectedFields.creditCardExpYear) sampleData[detectedFields.creditCardExpYear] = "2025";
        if (detectedFields.creditCardType) sampleData[detectedFields.creditCardType] = "visa"; // Use lowercase for common dropdown values
        if (detectedFields.subject) sampleData[detectedFields.subject] = "Sales Inquiry";
        if (detectedFields.message) sampleData[detectedFields.message] = "I am interested in learning more about your products and services.";
        
        // Update the form data text box with detected fields
        if (Object.keys(sampleData).length > 0) {
          setFormData(JSON.stringify(sampleData, null, 2));
          setLastResult(`Auto-detected ${Object.keys(sampleData).length} form fields and populated the form data.`);
        } else {
          setLastResult('No form fields were auto-detected on the current page.');
        }
        
        console.log('Auto-detected form fields:', detectedFields);
      } else {
        throw new Error(result.error || 'Failed to auto-detect form fields');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setActions(prev => [...prev, {
        type: 'getText' as any,
        params: { action: 'autoDetectFields' },
        timestamp: new Date(),
        error: errorMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearActions = () => {
    setActions([]);
    setLastResult(null);
    setError(null);
  };

  const handleScreenshotViewport = () => {
    executeAction({ type: 'screenshotViewport', params: {} });
  };
  
  const handleScreenshotFullPage = () => {
    executeAction({ type: 'screenshotFullPage', params: {} });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Browser Automation Testing
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Test the advanced browser automation capabilities of the SpiderEngine with CDP.
      </Typography>

      {/* Browser Mode Control */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Browser Mode: {headlessMode ? 'Headless (Hidden)' : 'Visible (Show Browser)'}
            </Typography>
            <Typography variant="body2">
              {headlessMode 
                ? 'Browser runs in the background. Switch to visible mode to see automation in action.'
                : 'Browser window is visible. You can watch the automation happen in real-time! Perfect for debugging clicks, form filling, and navigation.'
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <Button
              variant="contained"
              onClick={toggleHeadlessMode}
              disabled={loading}
              color={headlessMode ? 'warning' : 'success'}
            >
              {headlessMode ? 'Show Browser' : 'Hide Browser'}
            </Button>
            <Button
              variant="outlined"
              onClick={restartBrowser}
              disabled={loading}
              color="secondary"
            >
              Restart Browser
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Navigation Section */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <NavigationIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Navigation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                  placeholder="https://example.com"
                />
                <Button
                  variant="contained"
                  onClick={handleNavigate}
                  disabled={loading}
                  startIcon={<NavigationIcon />}
                >
                  Navigate
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Element Interaction Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <MouseIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Element Interaction</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="CSS Selector"
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                    fullWidth
                    placeholder="#example-selector, .class-name, button[type='submit']"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={handleClick}
                      disabled={loading}
                      startIcon={<MouseIcon />}
                    >
                      Click
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleGetText}
                      disabled={loading}
                      startIcon={<VisibilityIcon />}
                    >
                      Get Text
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleScreenshotElement}
                      disabled={loading}
                      startIcon={<VisibilityIcon />}
                    >
                      Screenshot
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={waitForNavigation}
                        onChange={(e) => setWaitForNavigation(e.target.checked)}
                      />
                    }
                    label="Wait for navigation after click"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Text Input Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <KeyboardIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Text Input</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField
                    label="Text to Type"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    fullWidth
                    placeholder="Enter text to type into the selected element"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    onClick={handleType}
                    disabled={loading}
                    startIcon={<KeyboardIcon />}
                    fullWidth
                  >
                    Type Text
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Form Filling Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <KeyboardIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Form Filling</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Form Data (JSON)"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    fullWidth
                    multiline
                    rows={6}
                    placeholder='{"#u_Hip_4607": "First Name", "#u_Hip_338354": "Last Name", "#u_Hip_4608": "email@example.com"}'
                    helperText="Enter JSON object with CSS selectors as keys and form values as strings. Use the buttons below for help."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleFillForm}
                    disabled={loading}
                    startIcon={<KeyboardIcon />}
                    sx={{ mr: 2, mb: 1 }}
                  >
                    Fill Form
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleAutoDetectFields}
                    disabled={loading}
                    startIcon={<VisibilityIcon />}
                    color="primary"
                    sx={{ mr: 2, mb: 1 }}
                  >
                    Auto-Detect Fields
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={handleGetPageHTML}
                    disabled={loading}
                    startIcon={<CodeIcon />}
                    color="secondary"
                  >
                    Debug: Get Page HTML
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Waiting Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <VisibilityIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Waiting & Conditions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField
                    label="Timeout (ms)"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(Number(e.target.value))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    onClick={handleWaitForElement}
                    disabled={loading}
                    startIcon={<VisibilityIcon />}
                    fullWidth
                  >
                    Wait for Element
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Script Execution Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CodeIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Script Execution</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="JavaScript Code"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="document.title"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleExecuteScript}
                    disabled={loading}
                    startIcon={<CodeIcon />}
                  >
                    Execute Script
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Screenshots Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <PhotoCameraIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Screenshots</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleScreenshotViewport}
                  disabled={loading}
                >
                  Viewport Screenshot
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleScreenshotFullPage}
                  disabled={loading}
                >
                  Full Page Screenshot
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Action History & Results</Typography>
                <Button variant="outlined" onClick={clearActions} disabled={actions.length === 0}>
                  Clear History
                </Button>
              </Box>
              
              {lastResult && typeof lastResult === 'string' ? (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={`data:image/png;base64,${lastResult}`}
                    alt="Screenshot"
                    style={{ maxWidth: '100%', border: '1px solid #ccc' }}
                  />
                </Box>
              ) : lastResult && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="subtitle2">Last Result:</Typography>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {typeof lastResult === 'object' ? JSON.stringify(lastResult, null, 2) : String(lastResult)}
                  </Typography>
                </Paper>
              )}

              {actions.length > 0 ? (
                <List>
                  {actions.slice(-10).reverse().map((action, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2">
                              {action.type} {action.error ? '❌' : '✅'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {action.timestamp?.toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Params: {JSON.stringify(action.params)}
                            </Typography>
                            {action.result && (
                              <Typography variant="body2" color="success.main">
                                Result: {typeof action.result === 'object' ? JSON.stringify(action.result) : action.result}
                              </Typography>
                            )}
                            {action.error && (
                              <Typography variant="body2" color="error.main">
                                Error: {action.error}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" align="center">
                  No actions performed yet. Try running some automation commands above.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AutomationTest;
