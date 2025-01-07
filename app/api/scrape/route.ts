import { NextResponse } from 'next/server';

type NewsItem = {
  title: string;
  content: string;
  sourceText: string;
  sourceUrl: string;
};

type CryptoPanicResult = {
  title: string;
  text?: string;
  domain: string;
  url: string;
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API_KEY = 'ddf611817dcfbf62abc6d209272f4afccefc7d98';

export async function POST(request: Request) {
  try {
    const { searchQuery } = await request.json();
    console.log('Starting news fetching for query:', searchQuery);

    // Construct the API URL based on search query
    let url = `https://cryptopanic.com/api/v1/posts/?auth_token=${API_KEY}&public=true&kind=news`;
    
    if (searchQuery) {
      // If searchQuery is provided, use it as a currency filter
      url += `&currencies=${encodeURIComponent(searchQuery.toUpperCase())}`;
    }
    
    console.log('Fetching news from CryptoPanic');
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error Response:', data);
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log('Received response from API');

    if (!data.results || !Array.isArray(data.results)) {
      console.log('No results found in API response');
      return NextResponse.json([]);
    }

    // Process only the first 3 news items
    const newsItems: NewsItem[] = data.results
      .slice(0, 3)
      .map((item: CryptoPanicResult) => ({
        title: item.title || '',
        content: item.text || item.title || '',
        sourceText: item.domain || '',
        sourceUrl: item.url || ''
      }))
      .filter((item: NewsItem) => item.title && item.content);

    if (newsItems.length === 0) {
      console.log('No valid news items found after processing');
      return NextResponse.json([]);
    }

    console.log(`Successfully processed ${newsItems.length} articles`);
    return NextResponse.json(newsItems);
  } catch (error) {
    console.error('Error in scrape route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 