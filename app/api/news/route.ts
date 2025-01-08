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
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Google News RSS feed'ini kullan
    const feed = await parser.parseURL(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    );

    const news_results = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.contentSnippet || '',
      date: item.pubDate || new Date().toISOString(),
      source: item.source || item.creator || '',
      thumbnail: item.media ? item.media.$.url : null
    }));

    return NextResponse.json({ news_results });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
} 