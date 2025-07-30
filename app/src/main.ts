import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { pathToFileURL } from 'url';

class WebCrawlerApp {
  private mainWindow: BrowserWindow | null = null;
  private apiProcess: ChildProcess | null = null;
  private readonly isDev = process.env.NODE_ENV === 'development';
  private readonly apiPort = 3001;

  constructor() {
    this.setupApp();
  }

  private setupApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.startApiServer();
      this.createMainWindow();
      this.setupMenu();
      this.setupIpcHandlers();
    });

    // Handle window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    // Handle app activate (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // Handle before quit
    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private async startApiServer(): Promise<void> {
    try {
      console.log('Starting WebCrawler API server...');
      
      const apiPath = this.isDev 
        ? join(__dirname, '../../api/src/server.ts')
        : join(__dirname, '../../api/dist/server.js');

      const command = this.isDev ? 'tsx' : 'node';
      const args = [apiPath];

      this.apiProcess = spawn(command, args, {
        stdio: 'pipe',
        env: {
          ...process.env,
          PORT: this.apiPort.toString(),
          NODE_ENV: this.isDev ? 'development' : 'production'
        }
      });

      this.apiProcess.stdout?.on('data', (data: Buffer) => {
        console.log(`API: ${data}`);
      });

      this.apiProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`API Error: ${data}`);
      });

      this.apiProcess.on('close', (code: number | null) => {
        console.log(`API process exited with code ${code}`);
      });

      // Wait a moment for the server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Failed to start API server:', error);
    }
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        webSecurity: true,
      },
      titleBarStyle: 'default',
      show: false,
    });

    // Load the React app
    const startUrl = this.isDev 
      ? 'http://localhost:3000'
      : pathToFileURL(join(__dirname, '../build/index.html')).href;

    this.mainWindow.loadURL(startUrl);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (this.isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Scrape Job',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-new-job');
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Handle API calls from renderer
    ipcMain.handle('api-call', async (event: Electron.IpcMainInvokeEvent, endpoint: string, options: any) => {
      try {
        const response = await fetch(`http://localhost:${this.apiPort}/api${endpoint}`, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: options.body ? JSON.stringify(options.body) : null
        });

        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 500 
        };
      }
    });

    // Handle app info requests
    ipcMain.handle('get-app-info', () => {
      return {
        version: app.getVersion(),
        name: app.getName(),
        apiPort: this.apiPort,
        isDev: this.isDev
      };
    });
  }

  private cleanup(): void {
    if (this.apiProcess) {
      console.log('Stopping API server...');
      this.apiProcess.kill('SIGTERM');
      this.apiProcess = null;
    }
  }
}

// Create app instance
new WebCrawlerApp();
