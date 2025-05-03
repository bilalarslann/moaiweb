import { Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  const headers = {
    'Content-Type': 'application/json',
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

    const response = await fetch(`https://api.solana.com${endpoint}?${params}`, {
      headers,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Solana Error:', error);
    return new Response(JSON.stringify({ error: 'Solana API Error' }), {
      status: 500,
      headers,
    });
  }
}; 