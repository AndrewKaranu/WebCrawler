import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
interface ElectronAPI {
  // API calls to the backend
  apiCall: (endpoint: string, options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
    status: number;
  }>;

  // App information
  getAppInfo: () => Promise<{
    version: string;
    name: string;
    apiPort: number;
    isDev: boolean;
  }>;

  // Menu events
  onMenuNewJob: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  apiCall: (endpoint: string, options = {}) => {
    return ipcRenderer.invoke('api-call', endpoint, options);
  },

  getAppInfo: () => {
    return ipcRenderer.invoke('get-app-info');
  },

  onMenuNewJob: (callback: () => void) => {
    ipcRenderer.on('menu-new-job', callback);
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
