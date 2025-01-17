import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { prompts } from '@/config/prompts';

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
          content: prompts.newsTranslation.tr
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