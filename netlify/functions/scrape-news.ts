import { Handler } from '@netlify/functions';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

type NewsItem = {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
};

const handler: Handler = async (event) => {
  let browser = null;
  const newsItems: NewsItem[] = [];

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const searchQuery = body.searchQuery || 'crypto'; // Default to 'crypto' if no query provided

    console.log('Setting up chromium');
    await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const url = `https://cryptopanic.com/news/${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
    console.log('Fetching news from:', url);
    
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get all the links first
    const titleElements = await page.$$('.title-text');
    
    if (titleElements.length === 0) {
      console.log('No news found, returning empty array');
      return {
        statusCode: 200,
        body: JSON.stringify([]),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }

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

    // Now visit each link and get the content
    for (const { title, cryptopanicLink } of newsLinks) {
      try {
        if (!cryptopanicLink) {
          console.log('Skipping article with no link:', title);
          continue;
        }

        await page.goto(cryptopanicLink, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
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

    if (newsItems.length === 0) {
      console.log('No news items were successfully processed');
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No news found', details: 'Could not process any news items' }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(newsItems),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Error in scrape-news function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to scrape news',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export { handler }; 