import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface NewsItem {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
}

export async function POST(request: Request) {
  const { searchQuery } = await request.json();
  let browser;

  try {
    console.log('Launching browser...');
    
    // Check if we're in production (Netlify) or development
    const isProduction = process.env.NETLIFY === 'true';
    
    const executablePath = isProduction 
      ? await chromium.executablePath()
      : process.env.CHROME_PATH || '/usr/bin/google-chrome';

    browser = await puppeteer.launch({
      headless: chromium.headless,
      executablePath,
      args: isProduction ? chromium.args : ['--no-sandbox'],
      defaultViewport: chromium.defaultViewport,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Fetching news for query:', searchQuery);
    await page.goto(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newsItems: NewsItem[] = [];
    
    // Get all the links first
    const titleElements = await page.$$('.title-text');
    const newsLinks = await Promise.all(
      titleElements.slice(0, 5).map(async (el: any) => {
        // Get the main title text without the source name
        const title = await el.evaluate((node: Element) => {
          // Get only the direct text content, excluding the source name element
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
        await page.goto(cryptopanicLink, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForSelector('.description-body', { timeout: 10000 });
        
        // Get the content
        const contentElements = await page.$$('.description-body p');
        const contentParts = await Promise.all(
          contentElements.map((el: any) => el.evaluate((node: Element) => node.textContent || ''))
        );
        const content = contentParts.join('\n');

        // Get the source URL and text from post-source-link
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
    return NextResponse.json(newsItems);

  } catch (err: any) {
    console.error('Error scraping CryptoPanic:', err.message);
    return NextResponse.json([]);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 