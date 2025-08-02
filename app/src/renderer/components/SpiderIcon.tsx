import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const SpiderIcon: React.FC<SvgIconProps> = (props) => {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C8.5 2 5.7 4.6 5.4 8H4c-.6 0-1 .4-1 1s.4 1 1 1h1.4c.3 3.4 3.1 6 6.6 6s6.3-2.6 6.6-6H20c.6 0 1-.4 1-1s-.4-1-1-1h-1.4C18.3 4.6 15.5 2 12 2zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
      <circle cx="12" cy="9" r="2"/>
      <path d="M3 6l3 3-3 3m18-6l-3 3 3 3M9 3l3 3-3 3m6-6l-3 3 3 3"/>
    </SvgIcon>
  );
};

export default SpiderIcon;
