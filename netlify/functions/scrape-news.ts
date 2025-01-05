import { Handler } from '@netlify/functions';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface NewsItem {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
}

interface ScrapedItem extends NewsItem {
  link: string;
}

const handler: Handler = async (event) => {
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
      headless: true,
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(5000);
    
    console.log('Fetching news for query:', searchQuery);
    await page.goto(`https://cryptopanic.com/news/search/?q=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    });

    // Extract all data in a single page evaluation to minimize browser interactions
    const newsItems: ScrapedItem[] = await page.evaluate(() => {
      const items: ScrapedItem[] = [];
      const rows = document.querySelectorAll('.row.news-row');
      
      // Only get the first news item
      if (rows.length > 0) {
        const row = rows[0];
        const titleEl = row.querySelector('.news-row-title');
        const sourceEl = row.querySelector('.news-row-source');
        const linkEl = row.querySelector('a.news-row-title');
        
        if (titleEl && linkEl) {
          const title = titleEl.textContent?.trim() || '';
          const link = (linkEl as HTMLAnchorElement).href;
          const sourceText = sourceEl?.textContent?.trim() || '';
          
          if (title && link) {
            items.push({
              title,
              content: 'Loading...',
              sourceText,
              sourceUrl: `https://${sourceText}`,
              link
            });
          }
        }
      }
      return items;
    });

    if (newsItems.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    // Get content for each article in parallel
    const contentPromises = newsItems.map(async (item) => {
      try {
        const newPage = await browser.newPage();
        await newPage.setDefaultNavigationTimeout(5000);
        
        await newPage.goto(item.link, {
          waitUntil: 'domcontentloaded',
          timeout: 5000
        });

        const content = await newPage.evaluate(() => {
          const paragraphs = Array.from(document.querySelectorAll('.news-row-text p, .news-row-text div'));
          return paragraphs.map(p => p.textContent || '').join('\n');
        });

        await newPage.close();
        return content || 'Content not available';
      } catch (err) {
        console.error(`Error fetching content for ${item.title}:`, err);
        return 'Content not available';
      }
    });

    const contents = await Promise.all(contentPromises);
    
    const finalNewsItems: NewsItem[] = newsItems.map((item, index) => ({
      title: item.title,
      content: contents[index],
      sourceText: item.sourceText,
      sourceUrl: item.sourceUrl
    }));

    console.log(`Successfully scraped ${finalNewsItems.length} news items`);
    return {
      statusCode: 200,
      body: JSON.stringify(finalNewsItems)
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

export { handler }; 