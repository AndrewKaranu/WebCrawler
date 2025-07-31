import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import components (we'll create these next)
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScrapeForm from './components/ScrapeForm';
import MassScraperForm from './components/MassScraperForm';
import AutomationTest from './components/AutomationTest';
import DiveTest from './components/DiveTest';
import JobsList from './components/JobsList';
import Results from './components/Results';

// Create dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

const App: React.FC = () => {
  const [appInfo, setAppInfo] = useState<{
    version: string;
    name: string;
    apiPort: number;
    isDev: boolean;
  } | null>(null);

  useEffect(() => {
    // Get app information from Electron
    if (window.electronAPI) {
      window.electronAPI.getAppInfo().then(setAppInfo);
    }

    // Listen for menu events
    const handleMenuNewJob = () => {
      // Navigate to scrape form or trigger new job modal
      console.log('New job requested from menu');
    };

    if (window.electronAPI) {
      window.electronAPI.onMenuNewJob(handleMenuNewJob);
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-new-job');
      }
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          {/* Sidebar Navigation */}
          <Sidebar />
          
          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Top App Bar */}
            <AppBar position="static" sx={{ zIndex: 1 }}>
              <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  WebCrawler
                </Typography>
                {appInfo && (
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    v{appInfo.version} | API: {appInfo.apiPort}
                    {appInfo.isDev && ' (Dev)'}
                  </Typography>
                )}
              </Toolbar>
            </AppBar>

            {/* Page Content */}
            <Container 
              maxWidth={false} 
              sx={{ 
                flexGrow: 1, 
                py: 3, 
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/scrape" element={<ScrapeForm />} />
                <Route path="/mass-scraper" element={<MassScraperForm />} />
                <Route path="/automation" element={<AutomationTest />} />
                <Route path="/dive" element={<DiveTest />} />
                <Route path="/jobs" element={<JobsList />} />
                <Route path="/results/:jobId?" element={<Results />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
