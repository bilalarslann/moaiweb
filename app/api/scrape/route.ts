import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

type NewsItem = {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
};

export const maxDuration = 60; // Set max duration to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let browser = null;
  const newsItems: NewsItem[] = [];

  try {
    const { searchQuery } = await request.json();
    console.log('Starting news scraping for query:', searchQuery);

    // Configure Chrome for Netlify environment
    console.log('Setting up chromium');
    await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');
    
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    });

    console.log('Browser launched successfully');
    const page = await browser.newPage();
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const url = `https://cryptopanic.com/news/${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
    console.log('Fetching news from:', url);
    
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 15000
    });

    console.log('Page loaded, waiting for content');
    await page.waitForSelector('.title-text', { timeout: 10000 });
    
    // Get all the links first
    const titleElements = await page.$$('.title-text');
    
    if (titleElements.length === 0) {
      console.log('No news found, returning empty array');
      return NextResponse.json([]);
    }

    const newsLinks = await Promise.all(
      titleElements.slice(0, 3).map(async (el) => { // Reduced to 3 articles for faster processing
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

        console.log(`Processing article: ${title}`);
        await page.goto(cryptopanicLink, {
          waitUntil: 'networkidle0',
          timeout: 15000
        });
        
        await page.waitForSelector('.description-body', { timeout: 10000 });
        
        const { content, sourceInfo } = await page.evaluate(() => {
          const contentElements = document.querySelectorAll('.description-body p');
          const content = Array.from(contentElements)
            .map(el => el.textContent || '')
            .join('\n');

          const sourceLink = document.querySelector('.post-source-link');
          const sourceInfo = sourceLink ? {
            text: sourceLink.textContent || '',
            url: `https://${sourceLink.textContent || ''}`
          } : null;

          return { content, sourceInfo };
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
      return NextResponse.json([]);
    }

    console.log(`Successfully processed ${newsItems.length} articles`);
    return NextResponse.json(newsItems);
  } catch (error) {
    console.error('Error in scrape route:', error);
    return NextResponse.json(
      { error: 'Failed to scrape news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
} 