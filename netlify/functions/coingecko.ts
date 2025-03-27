import { Handler } from '@netlify/functions';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

const handler: Handler = async (event, context) => {
  const apiKey = process.env.COINGECKO_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CoinGecko API key is not configured' }),
    };
  }

  try {
    const url = new URL(event.rawUrl);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Endpoint parameter is required' }),
      };
    }

    const headers: HeadersInit = {
      'x-cg-demo-api-key': apiKey
    };

    const response = await fetch(`${COINGECKO_API_URL}${endpoint}`, {
      headers
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler }; 