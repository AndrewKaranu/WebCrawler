import { SpiderCore } from './SpiderCore';

/**
 * SpiderAutomation: Browser automation functionality for SpiderEngine
 */
export class SpiderAutomation extends SpiderCore {
  /**
   * Navigate to a URL and wait for load
   */
  async navigateTo(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'load'): Promise<void> {
    try {
      console.log(`Navigating to: ${url}`);
      
      // Navigate to the URL
      await this.sendCommand('Page.navigate', { url });
      
      // Wait based on the specified condition
      switch (waitUntil) {
        case 'load':
          await this.waitForCondition('document.readyState === "complete"');
          break;
        case 'domcontentloaded':
          await this.waitForCondition('document.readyState !== "loading"');
          break;
        case 'networkidle0':
          await this.waitForNetworkIdle(0);
          break;
        case 'networkidle2':
          await this.waitForNetworkIdle(2);
          break;
      }
      
      console.log(`Navigation completed: ${url}`);
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Click on an element by selector
   */
  async click(selector: string, options: { timeout?: number; waitForNavigation?: boolean } = {}): Promise<void> {
    try {
      console.log(`Clicking element: ${selector}`);
      
      // Wait for element to be clickable
      await this.waitForElement(selector, options.timeout || 10000);
      
      // Get element bounds for clicking
      const dom = await this.sendCommand('DOM.getDocument');
      const nodeId = await this.sendCommand('DOM.querySelector', {
        nodeId: dom.root.nodeId,
        selector,
      });

      if (!nodeId.nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      const bounds = await this.sendCommand('DOM.getBoxModel', {
        nodeId: nodeId.nodeId,
      });

      if (!bounds.model) {
        throw new Error(`Could not get bounds for element: ${selector}`);
      }

      // Calculate click position (center of element)
      const { content } = bounds.model;
      const x = content[0] + (content[4] - content[0]) / 2;
      const y = content[1] + (content[5] - content[1]) / 2;

      // Perform click
      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: Math.round(x),
        y: Math.round(y),
        button: 'left',
        clickCount: 1,
      });

      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: Math.round(x),
        y: Math.round(y),
        button: 'left',
        clickCount: 1,
      });

      // Wait for navigation if requested
      if (options.waitForNavigation) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.waitForCondition('document.readyState === "complete"');
      }

      console.log(`✓ Clicked element: ${selector}`);
    } catch (error) {
      throw new Error(`Failed to click ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Type text into an input element
   */
  async type(selector: string, text: string, options: { delay?: number; clear?: boolean } = {}): Promise<void> {
    try {
      console.log(`Typing into element: ${selector}`);
      
      // Wait for element
      await this.waitForElement(selector);
      
      // Focus the element first
      await this.focus(selector);
      
      // Clear the input if requested
      if (options.clear !== false) {
        await this.clearInput(selector);
      }
      
      // Type the text
      const delay = options.delay || 50;
      for (const char of text) {
        await this.sendCommand('Input.dispatchKeyEvent', {
          type: 'char',
          text: char,
        });
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      console.log(`✓ Typed text into element: ${selector}`);
    } catch (error) {
      throw new Error(`Failed to type into ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Focus an element
   */
  async focus(selector: string): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (element && element.focus) {
            element.focus();
            true;
          } else {
            false;
          }
        `,
        returnByValue: true,
      });
    } catch (error) {
      throw new Error(`Failed to focus element ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear input field
   */
  async clearInput(selector: string): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (element && 'value' in element) {
            element.value = '';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            true;
          } else {
            false;
          }
        `,
        returnByValue: true,
      });
    } catch (error) {
      throw new Error(`Failed to clear input ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          const select = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (select && select.tagName === 'SELECT') {
            select.value = '${value.replace(/'/g, "\\'")}';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            true;
          } else {
            false;
          }
        `,
        returnByValue: true,
      });

      if (!result.result.value) {
        throw new Error(`Select element not found or invalid: ${selector}`);
      }
    } catch (error) {
      throw new Error(`Failed to select option in ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.sendCommand('Runtime.evaluate', {
          expression: `
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
            element && element.offsetParent !== null
          `,
          returnByValue: true,
        });
        
        if (result.result.value) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Element "${selector}" not found or not visible within ${timeout}ms`);
  }

  /**
   * Wait for element to disappear
   */
  async waitForElementToDisappear(selector: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.sendCommand('Runtime.evaluate', {
          expression: `
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
            !element || element.offsetParent === null
          `,
          returnByValue: true,
        });
        
        if (result.result.value) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Element "${selector}" still visible after ${timeout}ms`);
  }

  /**
   * Get element text content
   */
  async getText(selector: string): Promise<string> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
          element ? element.textContent || element.innerText || '' : ''
        `,
        returnByValue: true,
      });
      
      return result.result.value || '';
    } catch (error) {
      throw new Error(`Failed to get text from ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get element attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
          element ? element.getAttribute('${attribute.replace(/'/g, "\\'")}') : null
        `,
        returnByValue: true,
      });
      
      return result.result.value;
    } catch (error) {
      throw new Error(`Failed to get attribute ${attribute} from ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set element attribute
   */
  async setAttribute(selector: string, attribute: string, value: string): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (element) {
            element.setAttribute('${attribute.replace(/'/g, "\\'")}', '${value.replace(/'/g, "\\'")}');
            true;
          } else {
            false;
          }
        `,
        returnByValue: true,
      });
    } catch (error) {
      throw new Error(`Failed to set attribute ${attribute} on ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            true;
          } else {
            false;
          }
        `,
        returnByValue: true,
      });
      
      // Wait a moment for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      throw new Error(`Failed to scroll to element ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scroll page by pixels
   */
  async scrollBy(x: number, y: number): Promise<void> {
    try {
      await this.sendCommand('Runtime.evaluate', {
        expression: `window.scrollBy(${x}, ${y})`,
      });
      
      // Wait a moment for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      throw new Error(`Failed to scroll by (${x}, ${y}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hover over an element
   */
  async hover(selector: string): Promise<void> {
    try {
      // Wait for element
      await this.waitForElement(selector);
      
      // Get element bounds
      const dom = await this.sendCommand('DOM.getDocument');
      const nodeId = await this.sendCommand('DOM.querySelector', {
        nodeId: dom.root.nodeId,
        selector,
      });

      if (!nodeId.nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      const bounds = await this.sendCommand('DOM.getBoxModel', {
        nodeId: nodeId.nodeId,
      });

      if (!bounds.model) {
        throw new Error(`Could not get bounds for element: ${selector}`);
      }

      // Calculate hover position (center of element)
      const { content } = bounds.model;
      const x = content[0] + (content[4] - content[0]) / 2;
      const y = content[1] + (content[5] - content[1]) / 2;

      // Dispatch mouse move event
      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(x),
        y: Math.round(y),
      });
    } catch (error) {
      throw new Error(`Failed to hover over ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute custom JavaScript code
   */
  async evaluateScript<T = any>(script: string): Promise<T> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: script,
        returnByValue: true,
        awaitPromise: true,
      });
      
      if (result.exceptionDetails) {
        throw new Error(`JavaScript execution failed: ${result.exceptionDetails.text}`);
      }
      
      return result.result.value;
    } catch (error) {
      throw new Error(`Failed to execute script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for a condition to be true
   */
  async waitForCondition(condition: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.sendCommand('Runtime.evaluate', {
          expression: condition,
          returnByValue: true,
        });
        
        if (result.result.value) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Condition "${condition}" not met within ${timeout}ms`);
  }

  /**
   * Fill out a form with data
   */
  async fillForm(formData: Record<string, string>, submitSelector?: string): Promise<void> {
    try {
      console.log('Filling form with data:', Object.keys(formData));
      
      // Wait for the page to be fully loaded and stable
      console.log('Waiting for page to be fully loaded...');
      await this.waitForCondition('document.readyState === "complete"', 10000);
      
      // Give the page a moment to render dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // First, let's check which elements actually exist on the page
      const existingElements: string[] = [];
      const missingElements: string[] = [];
      
      console.log('Checking which form elements exist...');
      for (const selector of Object.keys(formData)) {
        try {
          const exists = await this.checkElementExists(selector);
          if (exists) {
            existingElements.push(selector);
          } else {
            missingElements.push(selector);
          }
        } catch (error) {
          missingElements.push(selector);
        }
      }
      
      console.log('Elements found:', existingElements);
      if (missingElements.length > 0) {
        console.log('Elements NOT found:', missingElements);
        
        // Try to find similar elements or alternatives and update formData accordingly
        for (const missingSelector of missingElements) {
          const alternatives = await this.findAlternativeSelectors(missingSelector);
          if (alternatives.length > 0) {
            console.log(`Alternative selectors for ${missingSelector}:`, alternatives);
            // Use the first working alternative
            for (const alt of alternatives) {
              if (await this.checkElementExists(alt)) {
                console.log(`Using alternative selector for ${missingSelector}: ${alt}`);
                // Map the value to the alternative selector
                formData[alt] = formData[missingSelector];
                existingElements.push(alt);
                break;
              }
            }
          }
        }
        
        // If no elements found at all, let's debug the page
        if (existingElements.length === 0) {
          console.log('No form elements found, debugging page state...');
          const allFormElements = await this.getFormElements();
          console.log('All form elements on page:', allFormElements);
          
          // Get a sample of the page HTML to see what's actually there
          const pageHTML = await this.getPageHTML();
          console.log('Page HTML sample (first 1000 chars):', pageHTML.substring(0, 1000));
        }
      }
      
      // Fill each field, trying alternatives if the original selector fails
      let successCount = 0;
      let failureCount = 0;
      for (const [origSelector, value] of Object.entries(formData)) {
        let selector = origSelector;
        let elementFound = existingElements.includes(selector);
        
        // If original not present, try alternatives
        if (!elementFound) {
          console.log(`Element ${selector} not found in pre-check, verifying and trying alternatives...`);
          
          // Double-check the original selector first
          elementFound = await this.checkElementExists(selector);
          if (elementFound) {
            console.log(`Element ${selector} actually exists on re-check`);
          } else {
            const alts = await this.findAlternativeSelectors(selector);
            console.log(`Trying ${alts.length} alternatives for ${selector}:`, alts);
            
            for (const alt of alts) {
              console.log(`Checking alternative: ${alt}`);
              const altExists = await this.checkElementExists(alt);
              console.log(`Alternative ${alt} exists: ${altExists}`);
              if (altExists) {
                selector = alt;
                elementFound = true;
                console.log(`Using alternative selector for ${origSelector}: ${selector}`);
                break;
              }
            }
          }
        }
        
        if (!elementFound) {
          console.warn(`Skipping ${origSelector} - no working selector found`);
          failureCount++;
          continue;
        }
        console.log(`Setting field ${selector} with value: ${value}`);
        try {
          // Directly set the element value and dispatch events via Runtime.evaluate
          const evalResult = await this.sendCommand('Runtime.evaluate', {
            expression: `(() => {
              const el = document.querySelector('${selector}');
              if (!el) return false;
              el.focus();
              el.value = ${JSON.stringify(value)};
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.blur();
              return true;
            })()` ,
            returnByValue: true,
          });
          if (!evalResult.result.value) {
            throw new Error(`Element ${selector} not found or JS evaluation failed`);
          }
          console.log(`✓ Value set for ${selector}`);
          successCount++;
        } catch (error) {
          console.error(`✗ Failed to set ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failureCount++;
        }
      }
      
      console.log(`Form filling summary: ${successCount} successful, ${failureCount} failed`);
      
      if (submitSelector && successCount > 0) {
        try {
          console.log(`Attempting to click submit button: ${submitSelector}`);
          await this.scrollToElement(submitSelector);
          await this.click(submitSelector, { waitForNavigation: true });
          console.log('✓ Form submitted successfully');
        } catch (error) {
          console.log(`✗ Failed to submit form: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }
      
      if (successCount === 0) {
        throw new Error('No form fields could be filled - all selectors were invalid or elements not found. Use the debug buttons to inspect the page structure.');
      }
      
      console.log('Form filling completed');
    } catch (error) {
      throw new Error(`Failed to fill form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Smart form filling with auto-detection fallback
   */
  async smartFillForm(formData: Record<string, string>, submitSelector?: string): Promise<void> {
    console.log('Smart form filling initiated');
    
    // First try auto-detection
    const detectedFields = await this.autoDetectFormFields();
    
    // Map provided data to detected fields
    const mappedFormData: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(formData)) {
      let bestMatch: string | null = null;
      
      // Look for exact matches first
      const exactMatch = detectedFields.find(field => 
        field.name === key || field.id === key || field.placeholder === key
      );
      
      if (exactMatch) {
        bestMatch = exactMatch.selector;
      } else {
        // Look for partial matches
        const partialMatch = detectedFields.find(field =>
          field.name?.toLowerCase().includes(key.toLowerCase()) ||
          field.id?.toLowerCase().includes(key.toLowerCase()) ||
          field.placeholder?.toLowerCase().includes(key.toLowerCase())
        );
        
        if (partialMatch) {
          bestMatch = partialMatch.selector;
        }
      }
      
      if (bestMatch) {
        mappedFormData[bestMatch] = value;
        console.log(`Mapped ${key} -> ${bestMatch}`);
      } else {
        // Fall back to original selector
        mappedFormData[key] = value;
        console.log(`Using original selector for ${key}`);
      }
    }
    
    // Fill the form with mapped data
    await this.fillForm(mappedFormData, submitSelector);
  }

  /**
   * Auto-detect form fields on the page
   */
  async autoDetectFormFields(): Promise<Array<{selector: string, type: string, name?: string, id?: string, placeholder?: string}>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const formElements = [];
            const inputs = document.querySelectorAll('input, select, textarea');
            
            inputs.forEach((el, index) => {
              // Skip hidden, submit, and button inputs
              if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') {
                return;
              }
              
              let selector = '';
              
              // Try ID first
              if (el.id) {
                selector = '#' + el.id;
              }
              // Then name
              else if (el.name) {
                selector = '[name="' + el.name + '"]';
              }
              // Then try to build a unique selector
              else {
                selector = el.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')';
              }
              
              formElements.push({
                selector: selector,
                type: el.type || el.tagName.toLowerCase(),
                name: el.name || null,
                id: el.id || null,
                placeholder: el.placeholder || null
              });
            });
            
            return formElements;
          })()
        `,
        returnByValue: true,
      });
      
      return result.result.value || [];
    } catch (error) {
      console.error('Auto-detect form fields failed:', error);
      return [];
    }
  }

  /**
   * Check if an element exists on the page
   */
  private async checkElementExists(selector: string): Promise<boolean> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            try {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
              const exists = !!element;
              const visible = element && element.offsetParent !== null;
              console.log('Element check for "${selector}": exists=' + exists + ', visible=' + visible);
              return exists;
            } catch (e) {
              console.log('Error checking element "${selector}":', e.message);
              return false;
            }
          })()
        `,
        returnByValue: true,
      });
      
      return result.result.value === true;
    } catch (error) {
      console.log(`Error in checkElementExists for ${selector}:`, error);
      return false;
    }
  }

  /**
   * Find alternative selectors for missing elements
   */
  private async findAlternativeSelectors(originalSelector: string): Promise<string[]> {
    try {
      // Extract potential field names/identifiers from the original selector
      const alternatives: string[] = [];
      
      // If it's an ID selector, try name and type alternatives
      if (originalSelector.startsWith('#')) {
        const id = originalSelector.substring(1);
        alternatives.push(`[name="${id}"]`);
        alternatives.push(`[id*="${id}"]`);
        alternatives.push(`input[placeholder*="${id}"]`);
      }
      
      // If it's a name selector, try ID and other alternatives
      if (originalSelector.includes('[name=')) {
        const nameMatch = originalSelector.match(/\[name="([^"]+)"\]/);
        if (nameMatch) {
          const name = nameMatch[1];
          alternatives.push(`#${name}`);
          alternatives.push(`[id*="${name}"]`);
          alternatives.push(`input[placeholder*="${name}"]`);
        }
      }
      
      // Add common form field patterns
      const commonSelectors = [
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="tel"]',
        'textarea',
        'select'
      ];
      
      alternatives.push(...commonSelectors);
      
      return alternatives;
    } catch (error) {
      console.error('Error finding alternative selectors:', error);
      return [];
    }
  }

  /**
   * Get all form elements on the page for debugging
   */
  async getFormElements(): Promise<Array<{selector: string, type: string, name?: string, id?: string, placeholder?: string, visible?: boolean, outerHTML?: string}>> {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const formElements = [];
            const inputs = document.querySelectorAll('input, select, textarea, button');
            
            inputs.forEach((el, index) => {
              let selector = '';
              
              if (el.id) {
                selector = '#' + el.id;
              } else if (el.name) {
                selector = '[name="' + el.name + '"]';
              } else if (el.className) {
                selector = '.' + el.className.split(' ')[0];
              } else {
                selector = el.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')';
              }
              
              formElements.push({
                selector: selector,
                type: el.type || el.tagName.toLowerCase(),
                name: el.name || null,
                id: el.id || null,
                placeholder: el.placeholder || null,
                visible: el.offsetParent !== null,
                outerHTML: el.outerHTML.substring(0, 200) + (el.outerHTML.length > 200 ? '...' : '')
              });
            });
            
            return formElements;
          })()
        `,
        returnByValue: true,
      });
      
      return result.result.value || [];
    } catch (error) {
      console.error('Failed to get form elements:', error);
      return [];
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
      return result.result.value || '';
    } catch (error) {
      throw new Error(`Failed to get page HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
