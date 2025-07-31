import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box } from '@mui/material';
import { Dashboard, Code, Work, Assessment, SmartToy, TravelExplore, PlaylistAdd, Storage, Book } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

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

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              component="button"
              onClick={() => navigate(item.path)}
              sx={{
                bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
