import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

type CustomItem = {
  title: string;
  link: string;
  contentSnippet?: string;
  pubDate?: string;
  creator?: string;
  source?: string;
  media?: {
    $: {
      url: string;
    };
  };
};

const parser = new Parser<CustomItem>({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['source', 'source']
    ],
  },
  timeout: 10000, // 10 saniye timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/xml, text/xml, */*',
  },
});

// Basit bir önbellek implementasyonu
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// Yedek URL'ler
const RSS_URLS = [
  (query: string) => `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
  (query: string) => `https://news.google.com/news/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
  (query: string) => `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&num=100&ceid=US:en`
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Önbellekte varsa ve süresi geçmediyse, önbellekten dön
    const cacheKey = query.toLowerCase();
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedData.data);
    }

    // Ana arama terimlerini hazırla
    const searchQuery = encodeURIComponent(query);
    
    // Tüm URL'leri dene
    let feed = null;
    let lastError: Error | null = null;

    for (const getUrl of RSS_URLS) {
      try {
        feed = await parser.parseURL(getUrl(searchQuery));
        if (feed?.items?.length > 0) {
          break; // Başarılı sonuç aldık
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Error with URL ${getUrl(searchQuery)}:`, error);
        continue; // Sonraki URL'yi dene
      }
    }

    // Hiçbir URL çalışmadıysa ve önbellekte eski veri varsa, onu kullan
    if (!feed?.items?.length && cachedData) {
      console.log('Using stale cache data due to API failure');
      return NextResponse.json(cachedData.data);
    }

    // Hala başarısızsa hata döndür
    if (!feed?.items?.length) {
      throw new Error(lastError?.message || 'No results found');
    }

    // Haberleri işle
    const news_results = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.contentSnippet || '',
      date: item.pubDate || new Date().toISOString(),
      source: item.source || item.creator || '',
      thumbnail: item.media ? item.media.$.url : null
    }));

    // Sonuçları önbelleğe al
    const responseData = { news_results };
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Önbellekte eski veri varsa, onu kullan
    const cachedData = cache.get(query.toLowerCase());
    if (cachedData) {
      console.log('Using stale cache data due to error');
      return NextResponse.json(cachedData.data);
    }

    return NextResponse.json({ 
      error: 'Failed to fetch news',
      message: error instanceof Error ? error.message : 'Unknown error',
      news_results: [] 
    }, { status: 500 });
  }
} 