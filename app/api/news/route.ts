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
          content: `Sen profesyonel bir çevirmen ve kripto haber editörüsün. İngilizce haberleri Türkçe'ye çevir.

ÖNEMLİ KURALLAR:
1. Her haberi MUTLAKA Türkçe'ye çevir
2. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak (örnek: blockchain, mining, staking, DeFi, NFT)
3. Kripto para birimlerinin isimlerini değiştirme (örnek: Bitcoin, Ethereum, Solana)
4. Çevirdiğin metni kısaltma veya özetleme - tam çeviri yap
5. Akıcı ve doğal bir Türkçe kullan
6. Her zaman JSON formatında dön

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
      model: "gpt-4-turbo-preview",
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
  const language = searchParams.get('lang') || 'en'; // Default to English if not specified

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Use language-specific Google News RSS feed
    const feedUrl = language === 'tr' 
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`
      : `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    const feed = await parser.parseURL(feedUrl);

    const news_results = await Promise.all(feed.items.map(async item => {
      // Only translate if the target language is Turkish
      const newsContent = language === 'tr' 
        ? await translateNews(item.title || '', item.contentSnippet || '')
        : { title: item.title, content: item.contentSnippet };

      return {
        title: newsContent.title,
        link: item.link,
        snippet: newsContent.content,
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