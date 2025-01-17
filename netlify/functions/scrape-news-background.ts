import { Handler } from '@netlify/functions';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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

  const { searchQuery } = JSON.parse(event.body || '{}');
  let browser;

  try {
    console.log('Launching browser...');
    
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Fetching news for query:', searchQuery);
    await page.goto(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle0',
      timeout: 60000 // We can use longer timeouts now
    });

    await new Promise(resolve => setTimeout(resolve, 8000));

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newsItems: NewsItem[] = [];
    
    // Get all the links first
    const titleElements = await page.$$('.title-text');
    const newsLinks = await Promise.all(
      titleElements.slice(0, 5).map(async (el) => { // Back to 5 items
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

    // Now visit each link and get the content
    for (const { title, cryptopanicLink } of newsLinks) {
      try {
        await page.goto(cryptopanicLink, { waitUntil: 'networkidle0', timeout: 60000 });
        await page.waitForSelector('.description-body', { timeout: 15000 });
        
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
    return {
      statusCode: 200,
      body: JSON.stringify(newsItems)
    };

  } catch (err: any) {
    console.error('Error scraping CryptoPanic:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}; 