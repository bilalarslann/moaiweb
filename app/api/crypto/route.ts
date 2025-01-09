import { NextResponse } from 'next/server';

interface CoinData {
  symbol: string;
  description: string;
  image: string;
  market_cap_rank: number;
  type: string;
  id?: string;
  raw_symbol?: string;
  price_usd?: number;
  volume_24h?: number;
  market_cap?: number;
  price_change_24h?: number;
}

// Cache for coin list
let coinListCache: CoinData[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Rate limit protection
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function makeRateLimitedRequest(url: string) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  const response = await fetch(url);
  
  if (response.status === 429) { // Too Many Requests
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    return fetch(url); // Retry once
  }
  
  return response;
}

async function getCoinList() {
  const now = Date.now();
  if (coinListCache.length > 0 && (now - lastCacheTime) < CACHE_DURATION) {
    return coinListCache;
  }

  try {
    // Fetch multiple pages from free API with rate limiting
    const pages = await Promise.all([
      makeRateLimitedRequest(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`),
      makeRateLimitedRequest(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false`),
      makeRateLimitedRequest(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=3&sparkline=false`),
      makeRateLimitedRequest(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=4&sparkline=false`)
    ]);

    // Check if any request failed
    for (const response of pages) {
      if (!response.ok) {
        if (response.status === 429) {
          console.error('CoinGecko API rate limit reached');
          // Return cached data if available
          if (coinListCache.length > 0) {
            return coinListCache;
          }
        }
        console.error('CoinGecko API error:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
    }

    // Combine all pages
    const allData = (await Promise.all(pages.map(p => p.json()))).flat();
    
    coinListCache = allData.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      description: coin.name,
      image: coin.image,
      market_cap_rank: coin.market_cap_rank || 999999,
      type: "crypto",
      id: coin.id,
      raw_symbol: coin.symbol.toUpperCase(),
      price_usd: coin.current_price,
      volume_24h: coin.total_volume,
      market_cap: coin.market_cap,
      price_change_24h: coin.price_change_percentage_24h
    }));
    
    lastCacheTime = now;
    console.log(`Fetched ${coinListCache.length} coins from CoinGecko`);
    return coinListCache;
  } catch (error) {
    console.error('Error fetching coin list:', error);
    // Return cached data if available
    if (coinListCache.length > 0) {
      return coinListCache;
    }
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const query = searchParams.get('query');

    if (query) {
      const coins = await getCoinList();
      const searchQuery = query.toLowerCase();
      
      // Search in symbols and names
      const results = coins.filter(coin => 
        coin.symbol.toLowerCase().includes(searchQuery) || 
        coin.description.toLowerCase().includes(searchQuery) ||
        coin.id?.toLowerCase().includes(searchQuery)
      ).slice(0, 10).map(coin => ({  // Limit to top 10 results
        symbol: coin.symbol,
        description: coin.description,
        image: coin.image,
        market_cap_rank: coin.market_cap_rank,
        type: "crypto",
        id: coin.id,
        price_usd: coin.price_usd,
        volume_24h: coin.volume_24h,
        market_cap: coin.market_cap,
        price_change_24h: coin.price_change_24h
      }));

      // Sort results by relevance and market cap rank
      results.sort((a, b) => {
        // Exact matches first
        const aExact = a.symbol.toLowerCase() === searchQuery || a.description.toLowerCase() === searchQuery;
        const bExact = b.symbol.toLowerCase() === searchQuery || b.description.toLowerCase() === searchQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by market cap rank
        return (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999);
      });

      return new NextResponse(JSON.stringify(results), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Use rate limited request for external URLs
    const response = await makeRateLimitedRequest(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({ error: 'Rate limit reached. Please try again later.' }, { status: 429 });
      }
      throw new Error(`Exchange API error: ${response.status}`);
    }

    const data = await response.json();
    
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    return new NextResponse(
      JSON.stringify({ error: error?.message || 'Failed to fetch data' }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 