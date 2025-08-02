import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import GlassCard from './GlassCard';

// Dashboard styling - matching the purple theme
const dashboardContainerSx: SxProps<Theme> = {
  minHeight: '100vh',
  background: 'rgba(0, 0, 0, 0.9)',
  padding: 3,
  position: 'relative',
  overflow: 'auto',
  // Hide scrollbar while keeping scroll functionality
  scrollbarWidth: 'none', // Firefox
  msOverflowStyle: 'none', // Internet Explorer 10+
  '&::-webkit-scrollbar': {
    display: 'none' // WebKit browsers
  },
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
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  paddingBottom: 4,
  width: '100%'
};

const titleSx: SxProps<Theme> = {
  fontSize: { xs: '2rem', md: '3rem' },
  fontWeight: 'bold',
  background: 'linear-gradient(45deg, #a855f7, #c084fc)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
  mb: 4,
  textAlign: 'center'
};

const statsGridSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '1200px',
  mt: 2
};

const Dashboard: React.FC = () => {
  return (
    <Box sx={dashboardContainerSx}>
      <Box sx={mainContentSx}>
        {/* Dashboard Title */}
        <Typography sx={titleSx} component="h1">
          Dashboard
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={statsGridSx}>
          <Grid item xs={12} md={4}>
            <GlassCard>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ 
                  color: '#a855f7', 
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
                }}>
                  1,247
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)', mt: 1 }}>
                  Pages Scraped
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                  Total successful scrapes
                </Typography>
              </Box>
            </GlassCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <GlassCard>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ 
                  color: '#c084fc', 
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(192, 132, 252, 0.5)'
                }}>
                  89
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)', mt: 1 }}>
                  Active Jobs
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                  Currently processing
                </Typography>
              </Box>
            </GlassCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <GlassCard>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ 
                  color: '#a855f7', 
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
                }}>
                  98.3%
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)', mt: 1 }}>
                  Success Rate
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                  Last 30 days
                </Typography>
              </Box>
            </GlassCard>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Box sx={{ width: '100%', maxWidth: '1200px', mt: 4 }}>
          <Typography variant="h5" sx={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            mb: 3,
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <GlassCard sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 40px rgba(168, 85, 247, 0.2)'
                }
              }}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Start Scraping
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                    Begin a new scrape job
                  </Typography>
                </Box>
              </GlassCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <GlassCard sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 40px rgba(233, 30, 99, 0.2)'
                }
              }}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    View Results
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                    Browse scraped data
                  </Typography>
                </Box>
              </GlassCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <GlassCard sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 40px rgba(76, 175, 80, 0.2)'
                }
              }}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Manage Jobs
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                    Monitor progress
                  </Typography>
                </Box>
              </GlassCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <GlassCard sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 40px rgba(255, 193, 7, 0.2)'
                }
              }}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Analytics
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                    View insights
                  </Typography>
                </Box>
              </GlassCard>
            </Grid>
          </Grid>
        </Box>

        {/* Recent Activity */}
        <Box sx={{ width: '100%', maxWidth: '1200px', mt: 4 }}>
          <Typography variant="h5" sx={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            mb: 3,
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            Recent Activity
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <GlassCard>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                    Latest Jobs
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        E-commerce site scrape
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4ade80' }}>
                        Completed
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        News articles batch
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                        In Progress
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Social media data
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#a855f7' }}>
                        Queued
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <GlassCard>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                    Performance Overview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Avg. Response Time
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4ade80' }}>
                        1.2s
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Data Processed Today
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#a855f7' }}>
                        2.4 GB
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Active Spiders
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                        12
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
