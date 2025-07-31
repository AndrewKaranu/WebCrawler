import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import debug utilities
import '../debug-utils.js';

// Hide loading screen once React is ready
const hideLoading = () => {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    loadingElement.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      loadingElement.style.display = 'none';
    }, 300);
  }
};

// Create root and render app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide loading screen after a short delay to ensure everything is rendered
setTimeout(hideLoading, 1000);
