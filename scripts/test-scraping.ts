import { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

interface NewsItem {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
}

export async function scrapeNews(searchQuery?: string) {
  let browser: Browser | null = null;
  const newsItems: NewsItem[] = [];

  try {
    console.log('Launching chrome headless');

    // Get the Chrome path
    const executablePath = process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v119.0.0/chromium-v119.0.0-pack.tar'));
    console.log('Chrome executable path:', executablePath);
    
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath,
      defaultViewport: chromium.defaultViewport,
      ignoreHTTPSErrors: true
    });

    if (!browser) {
      throw new Error('Failed to launch browser');
    }

    const page = await browser.newPage();
    
    // Set a common desktop User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    
    // Disable webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Construct the URL
    const url = searchQuery 
      ? `https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`
      : 'https://cryptopanic.com/news';

    console.log('Navigating to:', url);
    
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for the content to load
    await page.waitForSelector('.title-text', { timeout: 10000 });
    
    // Get all news items
    const articles = await page.evaluate(() => {
      const items = document.querySelectorAll('.news-row');
      return Array.from(items).slice(0, 5).map(item => {
        const titleElement = item.querySelector('.title-text');
        const sourceElement = item.querySelector('.si-source-name');
        const sourceLink = item.querySelector('.post-source-link');
        
        const title = titleElement ? titleElement.textContent?.replace(sourceElement?.textContent || '', '').trim() : '';
        const sourceText = sourceLink ? sourceLink.textContent?.trim() : '';
        const sourceUrl = sourceText ? `https://${sourceText}` : '';
        const content = item.querySelector('.description-body')?.textContent?.trim() || '';
        
        return {
          title,
          content,
          sourceText,
          sourceUrl
        };
      });
    });

    // Filter out invalid items
    const validArticles = articles.filter(article => 
      article.title && 
      article.content && 
      article.sourceText && 
      article.sourceUrl
    );

    console.log(`Successfully scraped ${validArticles.length} news items`);
    return validArticles;

  } catch (error) {
    console.error('Error in scrapeNews:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Only run if this is the main module
if (require.main === module) {
  scrapeNews()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 