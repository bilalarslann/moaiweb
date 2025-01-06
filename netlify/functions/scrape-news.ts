import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { scrapeNews } from '../../scripts/test-scraping';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  console.log('Received event:', {
    httpMethod: event.httpMethod,
    body: event.body,
    headers: event.headers
  });

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
    console.log('Processing search query:', searchQuery);

    const results = await scrapeNews(searchQuery);
    console.log('Scraping results:', results);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(results)
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in scrape-news function:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to scrape news',
        details: errorMessage,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 