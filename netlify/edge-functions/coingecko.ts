import { Context } from '@netlify/edge-functions';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export default async (request: Request, context: Context) => {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-cg-demo-api-key': apiKey } : {}),
  };

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    const params = url.searchParams.toString().replace('endpoint=' + endpoint + '&', '');

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint parameter is required' }), {
        status: 400,
        headers,
      });
    }

    const response = await fetch(`${COINGECKO_API_URL}${endpoint}?${params}`, {
      headers,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('CoinGecko Error:', error);
    return new Response(JSON.stringify({ error: 'CoinGecko API Error' }), {
      status: 500,
      headers,
    });
  }
}; 