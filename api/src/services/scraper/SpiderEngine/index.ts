import { IEngine } from '../IEngine';
import { SpiderScraper } from './SpiderScraper';
import { SpiderAutomation } from './SpiderAutomation';
import { SpiderDiver, DiveOptions, SiteMap } from './SpiderDiver';
import { ScrapeOptions, EngineResult } from '../../../models/index';

/**
 * SpiderEngine: Main engine class that combines scraping and automation capabilities
 */
export class SpiderEngine implements IEngine {
  private scraper: SpiderScraper;
  private automation: SpiderAutomation;
  private diver: SpiderDiver;

  constructor() {
    // Use the same core instance for both scraper and automation
    this.scraper = new SpiderScraper();
    this.automation = new SpiderAutomation();
    this.diver = new SpiderDiver();
  }

  // Delegate IEngine properties to scraper
  get name(): string {
    return this.scraper.name;
  }

  get version(): string {
    return this.scraper.version;
  }

  get capabilities() {
    return this.scraper.capabilities;
  }

  // Delegate initialization
  async initialize(config?: any): Promise<void> {
    await this.scraper.initialize(config);
    // Copy the internal state to automation instance
    await this.syncInstances();
  }

  // Sync the internal state between scraper and automation instances
  private async syncInstances(): Promise<void> {
    // This is a bit of a hack, but we need to share the same browser instance
    // In a more sophisticated implementation, we'd use dependency injection
    const scraperAny = this.scraper as any;
    const automationAny = this.automation as any;
    const diverAny = this.diver as any;

    // Sync automation instance
    automationAny.browser = scraperAny.browser;
    automationAny.wsConnection = scraperAny.wsConnection;
    automationAny.debuggerUrl = scraperAny.debuggerUrl;
    automationAny.config = scraperAny.config;
    automationAny.isInitialized = scraperAny.isInitialized;
    automationAny.messageId = scraperAny.messageId;
    automationAny.pendingMessages = scraperAny.pendingMessages;
    automationAny.userDataDir = scraperAny.userDataDir;

    // Sync diver instance
    diverAny.browser = scraperAny.browser;
    diverAny.wsConnection = scraperAny.wsConnection;
    diverAny.debuggerUrl = scraperAny.debuggerUrl;
    diverAny.config = scraperAny.config;
    diverAny.isInitialized = scraperAny.isInitialized;
    diverAny.messageId = scraperAny.messageId;
    diverAny.pendingMessages = scraperAny.pendingMessages;
    diverAny.userDataDir = scraperAny.userDataDir;
  }

  // Scraping methods - delegate to scraper
  async scrape(options: ScrapeOptions): Promise<EngineResult> {
    return this.scraper.scrape(options);
  }

  async scrapeMultiple(urls: string[], options: ScrapeOptions): Promise<EngineResult[]> {
    return this.scraper.scrapeMultiple(urls, options);
  }

  // Automation methods - delegate to automation
  async navigateTo(url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'): Promise<void> {
    await this.syncInstances();
    return this.automation.navigateTo(url, waitUntil);
  }

  async click(selector: string, options?: { timeout?: number; waitForNavigation?: boolean }): Promise<void> {
    await this.syncInstances();
    return this.automation.click(selector, options);
  }

  async type(selector: string, text: string, options?: { delay?: number; clear?: boolean }): Promise<void> {
    await this.syncInstances();
    return this.automation.type(selector, text, options);
  }

  async focus(selector: string): Promise<void> {
    await this.syncInstances();
    return this.automation.focus(selector);
  }

  async clearInput(selector: string): Promise<void> {
    await this.syncInstances();
    return this.automation.clearInput(selector);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    await this.syncInstances();
    return this.automation.selectOption(selector, value);
  }

  async waitForElement(selector: string, timeout?: number): Promise<void> {
    await this.syncInstances();
    return this.automation.waitForElement(selector, timeout);
  }

  async waitForElementToDisappear(selector: string, timeout?: number): Promise<void> {
    await this.syncInstances();
    return this.automation.waitForElementToDisappear(selector, timeout);
  }

  async getText(selector: string): Promise<string> {
    await this.syncInstances();
    return this.automation.getText(selector);
  }

  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    await this.syncInstances();
    return this.automation.getAttribute(selector, attribute);
  }

  async setAttribute(selector: string, attribute: string, value: string): Promise<void> {
    await this.syncInstances();
    return this.automation.setAttribute(selector, attribute, value);
  }

  async scrollToElement(selector: string): Promise<void> {
    await this.syncInstances();
    return this.automation.scrollToElement(selector);
  }

  async scrollBy(x: number, y: number): Promise<void> {
    await this.syncInstances();
    return this.automation.scrollBy(x, y);
  }

  async hover(selector: string): Promise<void> {
    await this.syncInstances();
    return this.automation.hover(selector);
  }

  async screenshotElement(selector: string): Promise<string> {
    await this.syncInstances();
    return this.scraper.screenshotElement(selector);
  }

  async screenshotViewport(): Promise<string> {
    await this.syncInstances();
    return this.scraper.screenshotViewport();
  }

  async screenshotFullPage(): Promise<string> {
    await this.syncInstances();
    return this.scraper.screenshotFullPage();
  }

  async evaluateScript<T = any>(script: string): Promise<T> {
    await this.syncInstances();
    return this.automation.evaluateScript<T>(script);
  }

  async waitForCondition(condition: string, timeout?: number): Promise<void> {
    await this.syncInstances();
    return this.automation.waitForCondition(condition, timeout);
  }

  async fillForm(formData: Record<string, string>, submitSelector?: string): Promise<void> {
    await this.syncInstances();
    return this.automation.fillForm(formData, submitSelector);
  }

  async smartFillForm(formData: Record<string, string>, submitSelector?: string): Promise<void> {
    await this.syncInstances();
    return this.automation.smartFillForm(formData, submitSelector);
  }

  async autoDetectFormFields(): Promise<Array<{selector: string, type: string, name?: string, id?: string, placeholder?: string}>> {
    await this.syncInstances();
    return this.automation.autoDetectFormFields();
  }

  async getFormElements(): Promise<Array<{selector: string, type: string, name?: string, id?: string, placeholder?: string, visible?: boolean, outerHTML?: string}>> {
    await this.syncInstances();
    return this.automation.getFormElements();
  }

  async getPageHTML(): Promise<string> {
    await this.syncInstances();
    return this.automation.getPageHTML();
  }

  // Core methods - delegate to scraper (as it extends SpiderCore)
  async setHeadlessMode(headless: boolean): Promise<void> {
    await this.scraper.setHeadlessMode(headless);
    await this.syncInstances();
  }

  isHeadless(): boolean {
    return this.scraper.isHeadless();
  }

  async healthCheck(): Promise<boolean> {
    return this.scraper.healthCheck();
  }

  async cleanup(): Promise<void> {
    await this.scraper.cleanup();
    // Note: automation and diver instances will be cleaned up through shared references
  }

  // Diving methods - delegate to diver
  async dive(options: DiveOptions): Promise<SiteMap> {
    await this.syncInstances();
    return this.diver.dive(options);
  }

  getDiveProgress(): { processed: number; queued: number; visited: number } {
    return this.diver.getDiveProgress();
  }

  // Getter for initialized state
  get initialized(): boolean {
    return (this.scraper as any).initialized;
  }

  // Getter for config
  getConfig() {
    return this.scraper.getConfig();
  }
}

// Export diving types for external use
export type { DiveOptions, SiteMap, PageInfo } from './SpiderDiver';
