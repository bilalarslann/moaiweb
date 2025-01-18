import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import fetch from 'node-fetch';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/api/coingecko/', '');
    const response = await fetch(`${COINGECKO_API_URL}/${path}`);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('CoinGecko Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CoinGecko API Error' }),
    };
  }
}; 