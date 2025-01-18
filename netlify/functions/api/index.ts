import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const path = event.path.replace('/.netlify/functions/api/', '');
  const segments = path.split('/').filter(Boolean);

  try {
    // Route the request to the appropriate handler
    switch (segments[0]) {
      case 'openai': {
        const { handler: openaiHandler } = await import('./openai');
        const response = await openaiHandler(event, context);
        return response || { statusCode: 500, body: JSON.stringify({ error: 'No response from handler' }) };
      }
      
      case 'coingecko': {
        const { handler: coingeckoHandler } = await import('./coingecko');
        const response = await coingeckoHandler(event, context);
        return response || { statusCode: 500, body: JSON.stringify({ error: 'No response from handler' }) };
      }
      
      case 'solana': {
        const { handler: solanaHandler } = await import('./solana');
        const response = await solanaHandler(event, context);
        return response || { statusCode: 500, body: JSON.stringify({ error: 'No response from handler' }) };
      }
      
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