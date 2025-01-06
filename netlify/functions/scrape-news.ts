import { Handler } from '@netlify/functions';
import { scrapeNews } from '../../scripts/test-scraping';

export const handler: Handler = async (event) => {
  try {
    const { searchQuery } = JSON.parse(event.body || '{}');
    const results = await scrapeNews(searchQuery);
    
    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to scrape news' })
    };
  }
}; 