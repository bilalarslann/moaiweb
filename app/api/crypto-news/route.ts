import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

interface NewsItem {
  title: string;
  content: string;
  url: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Use Google News RSS feed API
    const response = await axios.get(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}+crypto+when:7d&hl=en-US&gl=US&ceid=US:en`);
    
    // Parse XML response
    const result = await parseXML(response.data);
    const items = result.rss.channel[0].item || [];
    
    const news: NewsItem[] = [];
    
    // Convert items to NewsItem array
    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];
      const title = item.title?.[0] || '';
      const description = item.description?.[0] || '';
      const link = item.link?.[0] || '';
      
      if (title && description && link) {
        news.push({
          title,
          content: description,
          url: link
        });
      }
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
} 