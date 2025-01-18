import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api/', '');
  const segments = path.split('/').filter(Boolean);

  try {
    // Route the request to the appropriate handler
    switch (segments[0]) {
      case 'openai':
        // Import OpenAI handler dynamically
        const { handler: openaiHandler } = await import('./openai');
        return openaiHandler(event, context);
      
      case 'coingecko':
        // Import CoinGecko handler dynamically
        const { handler: coingeckoHandler } = await import('./coingecko');
        return coingeckoHandler(event, context);
      
      case 'solana':
        // Import Solana handler dynamically
        const { handler: solanaHandler } = await import('./solana');
        return solanaHandler(event, context);
      
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Not Found' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}; 