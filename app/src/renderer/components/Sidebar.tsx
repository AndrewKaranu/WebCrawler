import React from 'react';
import '../styles/glassmorphic.css';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Box,
  Divider
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { 
  Dashboard, 
  Code, 
  Work, 
  Assessment, 
  SmartToy, 
  TravelExplore, 
  PlaylistAdd, 
  Storage, 
  Book
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import SpiderCanvas from './SpiderCanvas';

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Scrape', icon: <Code />, path: '/scrape' },
  { text: 'Mass Scraper', icon: <PlaylistAdd />, path: '/mass-scraper' },
  { text: 'Content Browser', icon: <Storage />, path: '/content' },
  { text: 'Automation', icon: <SmartToy />, path: '/automation' },
  { text: 'Dive', icon: <TravelExplore />, path: '/dive' },
  { text: 'Jobs', icon: <Work />, path: '/jobs' },
  { text: 'Results', icon: <Assessment />, path: '/results' },
  { text: 'Corpus', icon: <Book />, path: '/corpus' },
];

// Extract styled sx props to avoid complex inline unions
const logoContainerSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 0.5,
  mt: 6,
  mb: 2,
  width: '80px',
  height: '80px',
  margin: '0 auto',
  borderRadius: '12px',
  background: 'rgba(168, 85, 247, 0.1)',
  border: '1px solid rgba(168, 85, 247, 0.2)',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(168, 85, 247, 0.15)',
    transform: 'scale(1.05)',
    boxShadow: '0 2px 12px rgba(168, 85, 247, 0.3)'
  }
};

const overflowBoxSx: SxProps<Theme> = {
  overflow: 'hidden',
  flex: 1,
};

const drawerSx: SxProps<Theme> = {
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    background: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(168, 85, 247, 0.1)',
    borderLeft: 'none',
  },
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Create simple sx objects to avoid union type complexity
  const emptyBoxSx: SxProps<Theme> = {};

  return (
    <Drawer
      variant="permanent"
      sx={drawerSx}
      className="sidebar-drawer"
    >
      {/* @ts-ignore - MUI Box sx prop complexity issue */}
      <Box
        onClick={() => navigate('/')}
        sx={logoContainerSx}
      >
        <SpiderCanvas width={75} height={75} scale={0.12} hideControls />
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(168, 85, 247, 0.2)', mx: 2, mb: 2 }} />

      {/* @ts-ignore - MUI Box sx prop complexity issue */}
      <Box sx={overflowBoxSx} className="sidebar-overflow">
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem
                key={item.text}
                component="button"
                onClick={() => navigate(item.path)}
                sx={{
                  mb: 1,
                  borderRadius: '8px',
                  background: isActive ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  width: 'calc(100% - 16px)',
                  maxWidth: '100%',
                  '&:hover': {
                    background: 'rgba(168, 85, 247, 0.1)',
                    transform: 'translateX(2px)',
                    borderColor: 'rgba(168, 85, 247, 0.3)',
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: isActive ? '#a855f7' : 'rgba(255, 255, 255, 0.7)',
                    minWidth: 40
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiTypography-root': {
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'
                    }
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;