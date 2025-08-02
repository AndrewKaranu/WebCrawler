import React from 'react';
import { Card, CardContent, Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface GlassCardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, sx = {}, className }) => {
  const glassCardSx: SxProps<Theme> = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    ...sx
  };

  const contentBoxSx: SxProps<Theme> = {};

  return (
    <Card sx={glassCardSx} className={className}>
      <CardContent>
        <Box sx={contentBoxSx}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
};

export default GlassCard;
