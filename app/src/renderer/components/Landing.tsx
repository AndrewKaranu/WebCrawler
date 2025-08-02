import React, { Suspense } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import SpiderCanvas from './SpiderCanvas';

// Glass styling for the landing page - seamless with background
const landingContainerSx: SxProps<Theme> = {
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.9)',
  position: 'fixed',
  top: 0,
  left: 0,
  overflow: 'hidden', // Prevent scrolling
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
};

const mainContentSx: SxProps<Theme> = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: { xs: '98%', sm: '90%', md: '900px' },
  padding: { xs: '0 10px', sm: '0 20px', md: '0 40px' },
  textAlign: 'center',
  transform: { xs: 'translateY(15%)', sm: 'translateY(10%)', md: 'translateY(8%)' }
};

const titleSx: SxProps<Theme> = {
  fontSize: { xs: '2rem', sm: '3rem', md: '4rem', lg: '4.5rem' },
  fontWeight: 'bold',
  background: 'linear-gradient(45deg, #a855f7, #c084fc)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
  mb: { xs: 1.5, md: 2.5 },
  letterSpacing: '-0.02em'
};

const subtitleSx: SxProps<Theme> = {
  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.2rem', lg: '1.3rem' },
  color: 'rgba(255, 255, 255, 0.8)',
  maxWidth: { xs: '95%', sm: '85%', md: '700px' },
  margin: '0 auto',
  lineHeight: 1.6,
  fontWeight: 300
};

const canvasContainerSx: SxProps<Theme> = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 1,
  pointerEvents: 'none', // Allow clicks to pass through to background content
  '& canvas': {
    pointerEvents: 'auto' // Re-enable pointer events for the canvas itself
  }
};

const Landing: React.FC = () => {
  return (
    <Box sx={landingContainerSx}>
      {/* 3D Spider Model - positioned as background */}
      <Box sx={canvasContainerSx}>
        <Suspense fallback={null}>
          <SpiderCanvas width={window.innerWidth} height={window.innerHeight} />
        </Suspense>
      </Box>

      {/* Hero Section - directly in container, no extra wrapper */}
      <Box sx={mainContentSx}>
        <Typography sx={titleSx} component="h1">
          WebCrawler
        </Typography>
        <Typography sx={subtitleSx}>
          Unleash the power of intelligent web scraping with our advanced spider technology.
          Navigate the digital web with precision and style.
        </Typography>
      </Box>
    </Box>
  );
};

export default Landing;
