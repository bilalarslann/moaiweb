import chromium from 'chrome-aws-lambda';
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    const { searchQuery, context } = JSON.parse(event.body || '{}');
    
    if (!searchQuery) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Search query is required' })
      };
    }

    // Launch browser with AWS Lambda specific settings
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    // Set longer timeout for navigation
    page.setDefaultNavigationTimeout(30000);

    // Navigate to CoinDesk search
    await page.goto(`https://www.coindesk.com/search?s=${encodeURIComponent(searchQuery)}`);
    
    // Wait for news items to load
    await page.waitForSelector('article', { timeout: 10000 });

    // Extract news data
    const newsData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      return Array.from(articles).slice(0, 5).map(article => {
        const titleElement = article.querySelector('h6');
        const dateElement = article.querySelector('time');
        const linkElement = article.querySelector('a');
        
        return {
          title: titleElement?.textContent?.trim() || '',
          date: dateElement?.getAttribute('datetime') || '',
          content: '', // We'll get content from individual article pages
          sourceUrl: linkElement?.href || '',
          sourceText: 'CoinDesk'
        };
      });
    });

    // Get content for each article
    for (let news of newsData) {
      if (news.sourceUrl) {
        try {
          await page.goto(news.sourceUrl, { waitUntil: 'networkidle0' });
          const content = await page.evaluate(() => {
            const articleBody = document.querySelector('.article-body-text');
            if (articleBody) {
              const paragraphs = articleBody.querySelectorAll('p');
              return Array.from(paragraphs)
                .slice(0, 3)
                .map(p => p.textContent?.trim())
                .filter(Boolean)
                .join('\n\n');
            }
            return '';
          });
          news.content = content;
        } catch (error) {
          console.error(`Error fetching article content: ${error}`);
          news.content = 'Content not available';
        }
      }
    }

    await browser.close();

    // Filter out articles with empty content
    const validNews = newsData.filter(news => news.title && news.content);

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
      body: JSON.stringify({ error: 'Failed to scrape news' })
    };
  }
}; 