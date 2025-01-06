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
    
    // Configure Chrome for Netlify environment
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      },
      executablePath: await chromium.executablePath('https://raw.githubusercontent.com/Sparticuz/chromium/v119.0.0/source/chromium-v119.0.0-pack.tar'),
      headless: true,
      ignoreHTTPSErrors: true,
    });

    if (!browser) {
      throw new Error('Failed to launch browser');
    }

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const baseUrl = 'https://cryptopanic.com';
    const url = searchQuery 
      ? `${baseUrl}/news?search=${encodeURIComponent(searchQuery)}`
      : `${baseUrl}/news/`;

    console.log('Navigating to:', url);
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Scrolling page...');
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get all the links first
    console.log('Finding news articles...');
    const titleElements = await page.$$('.title-text');
    const newsLinks = await Promise.all(
      titleElements.slice(0, 5).map(async (el) => {
        const title = await el.evaluate((node: Element) => {
          const sourceElement = node.querySelector('.si-source-name');
          if (sourceElement) {
            sourceElement.remove();
          }
          return node.textContent || '';
        });
        const cryptopanicLink = await el.evaluate((node: Element) => {
          const anchor = node.closest('a') as HTMLAnchorElement;
          return anchor ? (anchor.href.startsWith('http') ? anchor.href : `${baseUrl}${anchor.href}`) : '';
        });
        return { title, cryptopanicLink };
      })
    );

    // Now visit each link and get the content
    for (const { title, cryptopanicLink } of newsLinks) {
      try {
        if (!cryptopanicLink) {
          console.log(`Skipping article with no link: ${title}`);
          continue;
        }

        console.log(`Processing article: ${title}`);
        await page.goto(cryptopanicLink, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        await page.waitForSelector('.description-body', { timeout: 10000 });
        
        const contentElements = await page.$$('.description-body p');
        const contentParts = await Promise.all(
          contentElements.map(el => el.evaluate((node: Element) => node.textContent || ''))
        );
        const content = contentParts.join('\n');

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
      } catch (err) {
        console.error(`Error processing article: ${title}`, err);
        continue;
      }
    }

    console.log(`Successfully scraped ${newsItems.length} news items`);
    return newsItems;

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