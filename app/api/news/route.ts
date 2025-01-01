import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { searchQuery } = await request.json();

    // Fetch news from CoinGecko
    const response = await axios.get(`https://www.coingecko.com/en/news?query=${encodeURIComponent(searchQuery)}`);
    const html = response.data;

    // Parse HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract news articles
    const articles = Array.from(document.querySelectorAll('article')).map(article => {
      const titleElement = article.querySelector('h2 a');
      const contentElement = article.querySelector('p');
      const sourceElement = article.querySelector('div.news-feed-article-source a');
      const dateElement = article.querySelector('time');

      return {
        title: titleElement?.textContent?.trim() || '',
        content: contentElement?.textContent?.trim() || '',
        sourceUrl: sourceElement?.getAttribute('href') || '',
        sourceText: sourceElement?.textContent?.trim() || '',
        date: dateElement?.getAttribute('datetime') || ''
      };
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('News scraping error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
} 