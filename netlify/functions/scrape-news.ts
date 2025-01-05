import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { Handler } from '@netlify/functions';

interface NewsItem {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  let browser;
  try {
    const { searchQuery, context } = JSON.parse(event.body || '{}');
    
    if (!searchQuery) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Search query is required' })
      };
    }

    // Initialize chromium
    await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');
    
    // Launch browser with Netlify specific settings
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    // Set user agent and disable webdriver
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    console.log('Navigating to CryptoPanic...');
    
    // Navigate to CryptoPanic search
    await page.goto(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Waiting for content to load...');
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll down to load more content
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Getting news items...');
    
    const newsItems: NewsItem[] = [];
    
    // Get all the links first
    const titleElements = await page.$$('.title-text');
    console.log(`Found ${titleElements.length} title elements`);
    
    const newsLinks = await Promise.all(
      titleElements.slice(0, 5).map(async (el) => {
        const title = await el.evaluate((node: Element) => {
          const sourceElement = node.querySelector('.si-source-name');
          if (sourceElement) {
            sourceElement.remove();
          }
          return node.textContent || '';
        });
        const cryptopanicLink = await el.evaluate((node: Element) => (node.closest('a') as HTMLAnchorElement).href);
        return { title, cryptopanicLink };
      })
    );

    console.log(`Processing ${newsLinks.length} news links...`);
    
    // Visit each link and get the content
    for (const { title, cryptopanicLink } of newsLinks) {
      try {
        console.log(`Processing article: ${title}`);
        await page.goto(cryptopanicLink, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForSelector('.description-body', { timeout: 10000 });
        
        // Get the content
        const contentElements = await page.$$('.description-body p');
        const contentParts = await Promise.all(
          contentElements.map(el => el.evaluate((node: Element) => node.textContent || ''))
        );
        const content = contentParts.join('\n');

        // Get the source URL and text
        const sourceInfo = await page.evaluate(() => {
          const sourceLink = document.querySelector('.post-source-link');
          if (!sourceLink) return null;
          
          const text = sourceLink.textContent || '';
          return {
            text: text,
            url: `https://${text}`
          };
        });

        if (title && content && sourceInfo) {
          newsItems.push({
            title: title.trim(),
            content: content.trim(),
            sourceText: sourceInfo.text.trim(),
            sourceUrl: sourceInfo.url
          });
          console.log(`Successfully added article: ${title}`);
        }
      } catch (error) {
        console.error(`Error processing article: ${title}`, error);
        continue;
      }
    }

    await browser.close();

    // Filter out articles with empty content
    const validNews = newsItems.filter(news => news.title && news.content);
    console.log(`Returning ${validNews.length} valid news items`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(validNews)
    };

  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to scrape news',
        details: error.message 
      })
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }
}; 