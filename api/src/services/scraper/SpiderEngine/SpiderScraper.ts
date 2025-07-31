import { SpiderCore } from './SpiderCore';
import { ScrapeOptions, EngineResult } from '../../../models/index';

// Document parsing libraries
// @ts-ignore
const pdf: any = require('pdf-parse');
// @ts-ignore
const mammoth: any = require('mammoth');

/**
 * SpiderScraper: Web scraping functionality for SpiderEngine
 */
export class SpiderScraper extends SpiderCore {
  /**
   * Scrape a single URL
   */
  async scrape(options: ScrapeOptions): Promise<EngineResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      console.log(`Scraping URL: ${options.url}`);
      
      // First, check the content type by making a HEAD request
      const contentType = await this.checkContentType(options.url);
      
      // Check if URL serves a document based on content type
      if (this.isDocumentContentType(contentType)) {
        const result = await this.scrapeDocument(options.url, startTime, contentType);
        return result;
      }
      
      // Navigate to the URL for regular web pages
      await this.sendCommand('Page.navigate', { url: options.url });
      
      // Wait for page load based on options
      await this.waitForLoad(options.waitFor || 0);
      
      // Attempt to dismiss cookie popups if present
      await this.dismissCookiePopups();
      
      // Get page content
      const dom = await this.sendCommand('DOM.getDocument');
      const html = await this.sendCommand('DOM.getOuterHTML', { nodeId: dom.root.nodeId });
      
      // Extract page information
      const [title, text, meta, links, images] = await Promise.all([
        this.extractTitle(),
        this.extractText(),
        this.extractMeta(),
        this.extractLinks(),
        this.extractImages(),
      ]);

      // Take screenshot if requested
      let screenshot: string | undefined;
      if (options.screenshot) {
        try {
          if (options.fullPage) {
            screenshot = await this.screenshotFullPage();
          } else {
            screenshot = await this.screenshotViewport();
          }
        } catch (error) {
          console.warn('Screenshot failed:', error);
        }
      }

      const loadTime = Date.now() - startTime;

      return {
        url: options.url,
        html: html.outerHTML,
        text,
        title,
        meta,
        links,
        images,
        screenshot,
        loadTime,
        statusCode: 200, // CDP doesn't provide direct access to status code
        headers: {}, // CDP doesn't provide direct access to response headers
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to scrape ${options.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape multiple URLs
   */
  async scrapeMultiple(urls: string[], options: ScrapeOptions): Promise<EngineResult[]> {
    const results: EngineResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrape({ ...options, url });
        results.push(result);
        
        // Add delay between requests if specified
        if (urls.indexOf(url) < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
        }
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        // Continue with next URL
        results.push({
          url,
          html: '',
          text: '',
          title: '',
          meta: {},
          links: [],
          images: [],
          loadTime: 0,
          statusCode: 0,
          headers: {},
          timestamp: new Date(),
        });
      }
    }
    
    return results;
  }

  /**
   * Scrape PDF or DOCX documents
   */
  private async scrapeDocument(url: string, startTime: number, contentType?: string): Promise<EngineResult> {
    try {
      console.log(`Scraping document: ${url} (Content-Type: ${contentType})`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      let extractedText = '';
      let title = '';
      
      // Use content type if provided, otherwise fall back to URL extension
      const actualContentType = contentType || response.headers.get('content-type') || '';
      
      if (actualContentType.includes('application/pdf') || /\.pdf$/i.test(url)) {
        const data = await pdf(Buffer.from(buffer));
        extractedText = data.text;
        title = data.info?.Title || 'PDF Document';
      } else if (actualContentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || /\.docx$/i.test(url)) {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        extractedText = result.value;
        title = 'DOCX Document';
      } else if (actualContentType.includes('application/msword') || /\.doc$/i.test(url)) {
        // For older .doc files, we can try mammoth but it might not work perfectly
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          extractedText = result.value;
          title = 'DOC Document';
        } catch (error) {
          extractedText = 'Unable to extract text from .doc file - consider converting to .docx';
          title = 'DOC Document (parsing failed)';
        }
      }
      
      const loadTime = Date.now() - startTime;
      
      return {
        url,
        html: '', // No HTML for documents
        text: extractedText,
        title,
        meta: { 'content-type': actualContentType },
        links: [],
        images: [],
        loadTime,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to parse document ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check content type by making a HEAD request
   */
  private async checkContentType(url: string): Promise<string> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.headers.get('content-type') || '';
    } catch (error) {
      // If HEAD request fails, return empty string to fall back to browser scraping
      console.warn(`HEAD request failed for ${url}, falling back to browser scraping`);
      return '';
    }
  }

  /**
   * Check if content type indicates a document we can parse
   */
  private isDocumentContentType(contentType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    
    return documentTypes.some(type => contentType.includes(type));
  }

  /**
   * Attempt to dismiss common cookie popups
   */
  private async dismissCookiePopups(): Promise<void> {
    try {
      // Quick check if any cookie popup indicators are present
      const hasPopup = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            // Common cookie popup indicators
            const cookieSelectors = [
              '[class*="cookie"]',
              '[id*="cookie"]',
              '[class*="consent"]',
              '[id*="consent"]',
              '[class*="gdpr"]',
              '[id*="gdpr"]',
              '[class*="privacy"]',
              '[id*="privacy"]'
            ];
            
            // Check if any elements match our selectors
            return cookieSelectors.some(selector => 
              document.querySelectorAll(selector).length > 0
            );
          })()
        `,
        returnByValue: true,
      });

      // Only proceed if we detected potential cookie popups
      if (!hasPopup.result.value) {
        return;
      }

      console.log('Cookie popup detected, attempting to dismiss...');

      // Try to find and click common dismiss buttons
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            // Common button texts and selectors for cookie dismissal
            const dismissSelectors = [
              // By text content (most reliable)
              'button:contains("Accept")',
              'button:contains("Accept All")',
              'button:contains("Allow All")',
              'button:contains("Accept Cookies")',
              'button:contains("OK")',
              'button:contains("Got it")',
              'button:contains("I Agree")',
              'button:contains("Agree")',
              'button:contains("Close")',
              'button:contains("Dismiss")',
              
              // By common class/id patterns
              '[class*="accept"]',
              '[class*="agree"]',
              '[class*="allow"]',
              '[class*="consent"] button',
              '[class*="cookie"] button',
              '[class*="gdpr"] button',
              '[id*="accept"]',
              '[id*="agree"]',
              '[id*="allow"]',
              
              // Generic close buttons in overlays
              '[class*="modal"] [class*="close"]',
              '[class*="overlay"] [class*="close"]',
              '[class*="popup"] [class*="close"]',
              
              // ARIA labels
              '[aria-label*="accept" i]',
              '[aria-label*="agree" i]',
              '[aria-label*="close" i]',
              '[aria-label*="dismiss" i]'
            ];

            // Helper function to check if element contains text (case insensitive)
            function containsText(element, text) {
              return element.textContent.toLowerCase().includes(text.toLowerCase());
            }

            // Try each selector
            for (let selector of dismissSelectors) {
              let elements;
              
              // Handle :contains() pseudo-selector manually
              if (selector.includes(':contains(')) {
                const match = selector.match(/^(.+?):contains\\("(.+?)"\\)$/);
                if (match) {
                  const [, baseSelector, text] = match;
                  elements = Array.from(document.querySelectorAll(baseSelector))
                    .filter(el => containsText(el, text));
                } else {
                  continue;
                }
              } else {
                elements = Array.from(document.querySelectorAll(selector));
              }

              // Find the best candidate (visible and clickable)
              for (let element of elements) {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                
                // Check if element is visible and clickable
                if (rect.width > 0 && rect.height > 0 && 
                    style.visibility !== 'hidden' && 
                    style.display !== 'none' &&
                    !element.disabled) {
                  
                  console.log('Clicking cookie dismiss button:', element);
                  element.click();
                  return true; // Successfully clicked
                }
              }
            }
            
            return false; // No suitable button found
          })()
        `,
        returnByValue: true,
      });

      // Give a moment for the popup to disappear
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      // Silently fail - don't let cookie popup issues break the scraping
      console.warn('Cookie popup dismissal failed, continuing with scraping:', error);
    }
  }

  /**
   * Wait for page to load
   */
  private async waitForLoad(additionalWait: number = 0): Promise<void> {
    // Wait for DOM content loaded
    await this.waitForDOMContentLoaded();
    
    // Wait for network idle (no more than 2 connections for 500ms)
    await this.waitForNetworkIdle(2);
    
    // Additional wait time if specified
    if (additionalWait > 0) {
      await new Promise(resolve => setTimeout(resolve, additionalWait));
    }
  }

  /**
   * Extract page title
   */
  private async extractTitle(): Promise<string> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: 'document.title',
        returnByValue: true,
      });
      return result.result.value || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract page text content
   */
  private async extractText(): Promise<string> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: 'document.body ? document.body.innerText : ""',
        returnByValue: true,
      });
      return result.result.value || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract meta tags
   */
  private async extractMeta(): Promise<Record<string, string>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          Array.from(document.querySelectorAll('meta')).reduce((meta, tag) => {
            const name = tag.getAttribute('name') || tag.getAttribute('property') || tag.getAttribute('http-equiv');
            const content = tag.getAttribute('content');
            if (name && content) {
              meta[name] = content;
            }
            return meta;
          }, {})
        `,
        returnByValue: true,
      });
      return result.result.value || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Extract all links from the page
   */
  private async extractLinks(): Promise<Array<{ href: string; text: string; title?: string }>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          Array.from(document.querySelectorAll('a[href]')).map(link => ({
            href: link.href,
            text: link.textContent?.trim() || '',
            title: link.getAttribute('title') || undefined
          }))
        `,
        returnByValue: true,
      });
      return result.result.value || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract all images from the page
   */
  private async extractImages(): Promise<Array<{ src: string; alt?: string; title?: string }>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          Array.from(document.querySelectorAll('img[src]')).map(img => ({
            src: img.src,
            alt: img.getAttribute('alt') || undefined,
            title: img.getAttribute('title') || undefined
          }))
        `,
        returnByValue: true,
      });
      return result.result.value || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Take a screenshot of a specific element
   */
  async screenshotElement(selector: string): Promise<string> {
    try {
      // Get element node
      const dom = await this.sendCommand('DOM.getDocument');
      const nodeId = await this.sendCommand('DOM.querySelector', {
        nodeId: dom.root.nodeId,
        selector,
      });

      if (!nodeId.nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Get element bounds
      const bounds = await this.sendCommand('DOM.getBoxModel', {
        nodeId: nodeId.nodeId,
      });

      if (!bounds.model) {
        throw new Error(`Could not get bounds for element: ${selector}`);
      }

      const { content } = bounds.model;
      const clip = {
        x: Math.round(content[0]),
        y: Math.round(content[1]),
        width: Math.round(content[4] - content[0]),
        height: Math.round(content[5] - content[1]),
        scale: 1,
      };

      // Take screenshot of the element
      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip,
        fromSurface: true,
      });

      return result.data;
    } catch (error) {
      throw new Error(`Failed to screenshot element "${selector}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Take a screenshot of the current viewport.
   */
  async screenshotViewport(): Promise<string> {
    try {
      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      return result.data;
    } catch (error) {
      throw new Error(`Failed to screenshot viewport: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Take a full page screenshot.
   */
  async screenshotFullPage(): Promise<string> {
    try {
      // Get full page dimensions
      const { contentSize } = await this.sendCommand('Page.getLayoutMetrics');
      const width = Math.ceil(contentSize.width);
      const height = Math.ceil(contentSize.height);
      
      // Override viewport to full page size
      await this.sendCommand('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      
      // Capture screenshot of full page
      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      
      // Clear viewport override
      await this.sendCommand('Emulation.clearDeviceMetricsOverride');
      
      return result.data;
    } catch (error) {
      throw new Error(`Failed to screenshot full page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get page HTML content
   */
  async getPageHTML(): Promise<string> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML',
        returnByValue: true,
      });
      return result.value || '';
    } catch (error) {
      throw new Error(`Failed to get page HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for DOM content to be loaded
   */
  private async waitForDOMContentLoaded(): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          new Promise((resolve) => {
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', resolve);
            } else {
              resolve();
            }
          })
        `,
        awaitPromise: true,
      });
    } catch (error) {
      // Fallback: just wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Wait for network to be idle (no more than maxConnections active requests)
   */
  private async waitForNetworkIdle(maxConnections: number = 0): Promise<void> {
    let activeConnections = 0;
    let idleTimer: NodeJS.Timeout | null = null;
    
    return new Promise((resolve) => {
      const checkIdle = () => {
        if (activeConnections <= maxConnections) {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            this.removeAllListeners('networkRequestStarted');
            this.removeAllListeners('networkRequestFinished');
            resolve();
          }, 500);
        }
      };

      this.on('networkRequestStarted', () => {
        activeConnections++;
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
      });

      this.on('networkRequestFinished', () => {
        activeConnections--;
        checkIdle();
      });

      // Initial check
      checkIdle();

      // Fallback timeout
      setTimeout(() => {
        this.removeAllListeners('networkRequestStarted');
        this.removeAllListeners('networkRequestFinished');
        resolve();
      }, 10000);
    });
  }
}
