import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { EngineCapabilities, EngineConfig, CDPTarget } from '../IEngine';

/**
 * SpiderCore: Core browser management and CDP communication for SpiderEngine
 */
export class SpiderCore extends EventEmitter {
  readonly name = 'SpiderEngine';
  readonly version = '1.0.0';
  readonly capabilities: EngineCapabilities = {
    javascript: true,
    cookies: true,
    screenshots: true,
    userInteraction: true,
    headless: true,
    proxy: true,
    stealth: true,
  };

  protected browser: ChildProcess | null = null;
  protected wsConnection: WebSocket | null = null;
  protected debuggerUrl: string | null = null;
  protected config: EngineConfig = {};
  protected isInitialized = false;
  protected messageId = 0;
  protected pendingMessages = new Map<number, { resolve: Function; reject: Function }>();
  protected userDataDir: string | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize the SpiderEngine with Chrome/Chromium browser
   */
  async initialize(config: EngineConfig = {}): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = {
      headless: true,
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      retries: 3,
      cache: false,
      ...config,
    };

    try {
      await this.launchBrowser();
      await this.connectToDebugger();
      await this.setupBrowser();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      throw new Error(`Failed to initialize SpiderEngine: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Launch Chrome/Chromium browser with CDP enabled
   */
  private async launchBrowser(): Promise<void> {
    // Create a unique user data directory to avoid conflicts with existing Chrome instances
    this.userDataDir = `${process.env.TEMP || '/tmp'}/chrome-automation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const chromeArgs = [
      '--remote-debugging-port=0', // Use random port
      `--user-data-dir=${this.userDataDir}`, // Unique user data directory
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--mute-audio',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-background-networking',
      '--disable-sync',
      '--metrics-recording-only',
      '--disable-default-apps',
      '--no-default-browser-check',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-client-side-phishing-detection',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-ipc-flooding-protection',
    ];

    // Add headless mode if specified
    if (this.config.headless) {
      chromeArgs.push('--headless=new');
    }

    // Try different Chrome/Chromium executable paths
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      'chrome',
      'chromium',
    ];

    let chromePath: string | null = null;
    for (const path of chromePaths) {
      try {
        // Test if chrome exists at this path
        const testProcess = spawn(path, ['--version'], { stdio: 'pipe' });
        await new Promise((resolve, reject) => {
          testProcess.on('exit', (code) => code === 0 ? resolve(null) : reject());
          testProcess.on('error', reject);
          setTimeout(reject, 3000);
        });
        chromePath = path;
        break;
      } catch {
        continue;
      }
    }

    if (!chromePath) {
      throw new Error('Chrome/Chromium not found. Please install Chrome or Chromium browser.');
    }

    console.log(`Launching Chrome from: ${chromePath}`);
    console.log(`Chrome args: ${chromeArgs.join(' ')}`);

    this.browser = spawn(chromePath, chromeArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // Handle browser process events
    this.browser.on('error', (error) => {
      console.error('Browser process error:', error);
      this.emit('error', error);
    });

    this.browser.on('exit', (code, signal) => {
      console.log(`Browser process exited with code ${code} and signal ${signal}`);
      this.isInitialized = false;
      this.emit('browserExit', { code, signal });
    });

    // Capture stderr for debugging
    this.browser.stderr?.on('data', (data) => {
      const output = data.toString();
      
      // Look for the debugging port in stderr
      const portMatch = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (portMatch) {
        const port = portMatch[1];
        this.debuggerUrl = `http://127.0.0.1:${port}`;
        console.log(`Chrome DevTools available on port ${port}`);
      }
      
      // Log other important messages
      if (output.includes('ERROR') || output.includes('FATAL')) {
        console.error('Chrome stderr:', output);
      }
    });

    // Wait for Chrome to start up and find the debugging port
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds total
    while (!this.debuggerUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.debuggerUrl) {
      throw new Error('Failed to get Chrome debugging URL within timeout');
    }

    console.log(`Chrome launched successfully with debugging URL: ${this.debuggerUrl}`);
  }

  /**
   * Connect to Chrome DevTools Protocol
   */
  private async connectToDebugger(): Promise<void> {
    if (!this.debuggerUrl) {
      throw new Error('No debugger URL available');
    }

    try {
      // Get available targets
      const response = await fetch(`${this.debuggerUrl}/json/list`);
      const targets = await response.json() as CDPTarget[];
      
      // Find the first page target
      const pageTarget = targets.find(target => target.type === 'page');
      if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
        throw new Error('No page target found');
      }

      // Connect to WebSocket
      this.wsConnection = new WebSocket(pageTarget.webSocketDebuggerUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.wsConnection) {
          return reject(new Error('WebSocket connection failed to initialize'));
        }

        this.wsConnection.on('open', () => {
          console.log('Connected to Chrome DevTools Protocol');
          resolve();
        });

        this.wsConnection.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

        this.wsConnection.on('close', () => {
          console.log('WebSocket connection closed');
          this.isInitialized = false;
        });

        this.wsConnection.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        // Set connection timeout
        setTimeout(() => {
          if (this.wsConnection?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      throw new Error(`Failed to connect to debugger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      // Handle command responses
      if (message.id && this.pendingMessages.has(message.id)) {
        const { resolve, reject } = this.pendingMessages.get(message.id)!;
        this.pendingMessages.delete(message.id);
        
        if (message.error) {
          reject(new Error(`CDP Error: ${message.error.message}`));
        } else {
          resolve(message.result);
        }
        return;
      }

      // Handle events
      if (message.method) {
        this.emit('cdpEvent', message);
      }
    } catch (error) {
      console.error('Failed to parse CDP message:', error);
    }
  }

  /**
   * Send CDP command
   */
  async sendCommand(method: string, params?: any): Promise<any> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not available');
    }

    const id = ++this.messageId;
    const message = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      
      this.wsConnection!.send(JSON.stringify(message));
      
      // Set timeout for the command
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`Command timeout: ${method}`));
        }
      }, this.config.timeout || 30000);
    });
  }

  /**
   * Setup browser with initial configuration
   */
  private async setupBrowser(): Promise<void> {
    // Enable necessary domains
    await this.sendCommand('Runtime.enable');
    await this.sendCommand('Network.enable');
    await this.sendCommand('Page.enable');
    await this.sendCommand('DOM.enable');
    
    // Try to enable Input domain (may not be available in all Chrome versions)
    try {
      await this.sendCommand('Input.enable');
      console.log('Input domain enabled successfully');
    } catch (error) {
      console.log('Input domain not available, using fallback methods for automation');
    }
    
    // Try to enable Debugger domain (optional for advanced features)
    try {
      await this.sendCommand('Debugger.enable');
      console.log('Debugger domain enabled successfully');
    } catch (error) {
      console.log('Debugger domain not available');
    }

    // Set viewport
    if (this.config.viewport) {
      await this.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: this.config.viewport.width,
        height: this.config.viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    }

    // Set user agent
    if (this.config.userAgent) {
      await this.sendCommand('Network.setUserAgentOverride', {
        userAgent: this.config.userAgent,
      });
    }

    // Setup stealth mode
    await this.setupStealthMode();
  }

  /**
   * Setup stealth mode to avoid detection
   */
  private async setupStealthMode(): Promise<void> {
    // Remove webdriver property
    await this.sendCommand('Runtime.addBinding', { name: 'removeWebdriver' });
    
    // Execute stealth scripts
    const stealthScript = `
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Hide automation indicators
      delete window.chrome.runtime;
      window.chrome = undefined;
    `;

    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: stealthScript,
      });
    } catch (error) {
      console.warn('Failed to setup stealth mode:', error);
    }
  }

  /**
   * Set headless mode (requires browser restart)
   */
  async setHeadlessMode(headless: boolean): Promise<void> {
    if (this.config.headless === headless) {
      return; // Already in the correct mode
    }
    
    this.config.headless = headless;
    
    // Restart browser with new headless setting
    await this.cleanup();
    await this.initialize(this.config);
  }

  /**
   * Get current headless mode setting
   */
  isHeadless(): boolean {
    return this.config.headless || false;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
        return false;
      }
      
      // Try a simple CDP command
      await this.sendCommand('Runtime.evaluate', { expression: '1 + 1' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup browser and connections
   */
  async cleanup(): Promise<void> {
    try {
      // Close WebSocket connection
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.close();
        this.wsConnection = null;
      }

      // Close browser
      if (this.browser && !this.browser.killed) {
        this.browser.kill('SIGTERM');
        
        // Wait for browser to close gracefully
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (this.browser && !this.browser.killed) {
              console.log('Force killing browser process');
              this.browser.kill('SIGKILL');
            }
            resolve(null);
          }, 5000);

          this.browser?.on('exit', () => {
            clearTimeout(timeout);
            resolve(null);
          });
        });
        
        this.browser = null;
      }

      // Clean up user data directory
      if (this.userDataDir) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(this.userDataDir)) {
            fs.rmSync(this.userDataDir, { recursive: true, force: true });
          }
        } catch (error) {
          console.warn('Failed to clean up user data directory:', error);
        }
        this.userDataDir = null;
      }

      this.isInitialized = false;
      this.debuggerUrl = null;
      this.pendingMessages.clear();
      
      console.log('SpiderEngine cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Check if engine is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): EngineConfig {
    return { ...this.config };
  }
}
