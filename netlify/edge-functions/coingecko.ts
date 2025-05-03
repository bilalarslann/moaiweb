import { Context } from '@netlify/edge-functions';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export default async (request: Request, context: Context) => {
  const apiKey = process.env.COINGECKO_API_KEY;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/coingecko/', '');
    const response = await fetch(`${COINGECKO_API_URL}/${path}`);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CoinGecko Error:', error);
    return new Response(JSON.stringify({ error: 'CoinGecko API Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 