import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const params = searchParams.get('params');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  try {
    const queryParams = new URLSearchParams();
    
    // Add default parameters based on endpoint
    if (endpoint.includes('market_chart')) {
      queryParams.set('vs_currency', 'usd');
      queryParams.set('days', '365'); // Get 1 year of data
      queryParams.set('interval', 'daily');
    } else if (endpoint.includes('ohlc')) {
      queryParams.set('vs_currency', 'usd');
      queryParams.set('days', '365'); // Get 1 year of data
    }

    // Add custom parameters if provided
    if (params) {
      params.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          queryParams.set(key, decodeURIComponent(value));
        }
      });
    }

    const apiUrl = `https://pro-api.coingecko.com/api/v3/${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('Calling CoinGecko API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-cg-pro-api-key': process.env.COINGECKO_API_KEY || ''
      },
      next: {
        revalidate: 60 // Cache for 60 seconds
      }
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      console.error('CoinGecko API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        url: apiUrl
      });

      return NextResponse.json({ 
        error: `CoinGecko API error: ${response.status} ${response.statusText}`,
        details: errorDetails
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Add rate limit headers to response
    const headers = new Headers();
    headers.set('x-ratelimit-limit', response.headers.get('x-ratelimit-limit') || '');
    headers.set('x-ratelimit-remaining', response.headers.get('x-ratelimit-remaining') || '');
    headers.set('x-ratelimit-reset', response.headers.get('x-ratelimit-reset') || '');

    return NextResponse.json(data, { 
      headers,
      status: 200 
    });
  } catch (error) {
    console.error('CoinGecko proxy error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch from CoinGecko',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 