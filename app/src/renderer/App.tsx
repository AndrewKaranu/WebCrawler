import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import components (we'll create these next)
import Sidebar from './components/Sidebar';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import ScrapeForm from './components/ScrapeForm';
import MassScraperForm from './components/MassScraperForm';
import ContentBrowser from './components/ContentBrowser';
import AutomationTest from './components/AutomationTest';
import DiveTest from './components/DiveTest';
import JobsList from './components/JobsList';
import Results from './components/Results';
import CorpusManager from './components/CorpusManager';

// Create dark theme with purple accents to match dashboard
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a855f7',
    },
    secondary: {
      main: '#c084fc',
    },
    background: {
      default: 'rgba(0, 0, 0, 0.95)',
      paper: 'rgba(0, 0, 0, 0.8)',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'rgba(0, 0, 0, 0.95)',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(192, 132, 252, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: -1
          }
        }
      }
    }
  }
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
      <Router 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        {/* @ts-ignore - Complex MUI sx union type */}
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
              background: 'rgba(0, 0, 0, 0.9)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(192, 132, 252, 0.05) 0%, transparent 50%)',
                pointerEvents: 'none',
                zIndex: 0
              }
            }}
          >
            {/* Top App Bar */}
            <AppBar 
              position="static" 
              sx={{ 
                zIndex: 2,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(168, 85, 247, 0.2)'
              }}
            >
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
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1,
                background: 'transparent'
              }}
            >
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/scrape" element={<ScrapeForm />} />
                <Route path="/mass-scraper" element={<MassScraperForm />} />
                <Route path="/content" element={<ContentBrowser />} />
                <Route path="/automation" element={<AutomationTest />} />
                <Route path="/dive" element={<DiveTest />} />
                <Route path="/jobs" element={<JobsList />} />
                <Route path="/results/:jobId?" element={<Results />} />
                <Route path="/corpus" element={<CorpusManager />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
