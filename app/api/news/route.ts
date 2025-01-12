import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import OpenAI from 'openai';

const openai = new OpenAI();

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

async function translateNews(title: string, content: string) {
  try {
    const translation = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Sen profesyonel bir çevirmen ve kripto haber editörüsün. İngilizce haberleri Türkçe'ye çevir. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak.

ÖNEMLİ KURALLAR:
1. Her haberi MUTLAKA Türkçe'ye çevir
2. Teknik terimleri ve kripto para isimlerini değiştirme
3. Çevirdiğin metni kısaltma veya özetleme
4. Her zaman JSON formatında dön

JSON formatı:
{
  "title": "çevrilmiş başlık",
  "content": "çevrilmiş içerik"
}`
        },
        {
          role: "user",
          content: `Title: ${title}\nContent: ${content}`
        }
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(translation.choices[0]?.message?.content || "{}");
    if (!result.title || !result.content) {
      console.error('Translation missing title or content');
      return { title, content }; // Return original if translation is incomplete
    }
    return result;
  } catch (error) {
    console.error('Translation error:', error);
    return { title, content }; // Return original if translation fails
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const feed = await parser.parseURL(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    );

    const news_results = await Promise.all(feed.items.map(async item => {
      // First translate the title and content
      const translated = await translateNews(
        item.title || '',
        item.contentSnippet || ''
      );

      return {
        title: translated.title,
        link: item.link,
        snippet: translated.content,
        date: item.pubDate || new Date().toISOString(),
        source: item.source || item.creator || '',
        thumbnail: item.media ? item.media.$.url : null
      };
    }));

    return NextResponse.json({ news_results });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
} 