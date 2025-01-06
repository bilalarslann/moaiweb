import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { scrapeNews } from '../../scripts/test-scraping';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { searchQuery } = JSON.parse(event.body || '{}');
    const results = await scrapeNews(searchQuery);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to scrape news' })
    };
  }
}; 