import { Context } from '@netlify/edge-functions';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export default async (request: Request, context: Context) => {
  const apiKey = context.env.COINGECKO_API_KEY;
  
  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${COINGECKO_API_URL}${endpoint}`, {
      headers: {
        'x-cg-demo-api-key': apiKey,
      },
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 