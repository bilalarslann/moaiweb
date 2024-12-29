import { Handler } from '@netlify/functions';
import { scrapeNews } from '../../scripts/test-scraping';

const handler: Handler = async (event) => {
  try {
    // Query parametresini al
    const query = event.queryStringParameters?.query || 'bitcoin';
    
    // Haberleri çek
    const news = await scrapeNews(query);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: news }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error in scrape-news function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

export { handler }; 