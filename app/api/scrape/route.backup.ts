import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';

interface NewsItem {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
}

export async function POST(request: Request) {
  let browser = null;
  const newsItems: NewsItem[] = [];

  try {
    const { searchQuery } = await request.json();
    console.log('Launching chrome headless');

    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.CHROME_PATH || undefined,
      headless: true
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Fetching news for query:', searchQuery);
    await page.goto(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get all the links first
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
        const cryptopanicLink = await el.evaluate((node: Element) => (node.closest('a') as HTMLAnchorElement).href);
        return { title, cryptopanicLink };
      })
    );

    // Now visit each link and get the content
    for (const { title, cryptopanicLink } of newsLinks) {
      try {
        await page.goto(cryptopanicLink, {
          waitUntil: ['domcontentloaded', 'networkidle0']
        });
        
        await page.waitForSelector('.description-body');
        
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
    return NextResponse.json(newsItems);

  } catch (error) {
    console.log('error', error);
    return NextResponse.json({
      error: error
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 