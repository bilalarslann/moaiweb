import { NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';

interface NewsItem {
  title: string;
  content: string;
  url: string;
}

async function scrapeNews(searchQuery: string): Promise<NewsItem[]> {
  try {
    console.log('Fetching news for query:', searchQuery);
    const response = await axios.get(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000
    });

    if (!response.data) {
      console.error('No data received from Cryptopanic');
      return [];
    }

    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const newsPromises: Promise<NewsItem | null>[] = [];

    const newsRows = document.querySelectorAll('.news-row');
    console.log('Found news rows:', newsRows.length);

    Array.from(newsRows).slice(0, 5).forEach((article: Element) => {
      const titleElement = article.querySelector('.title-text');
      const title = titleElement?.textContent?.trim() || '';
      const url = titleElement?.getAttribute('href') || '';
      const initialContent = article.querySelector('.description-body')?.textContent?.trim() || '';

      console.log('Processing news item:', { title, url });

      const newsPromise = (async () => {
        let content = initialContent;

        if (!content || content.length < 50) {
          try {
            const detailResponse = await axios.get(`https://cryptopanic.com${url}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
              },
              timeout: 5000
            });
            const detailDom = new JSDOM(detailResponse.data);
            content = detailDom.window.document.querySelector('.description-body')?.textContent?.trim() || '';
          } catch (error) {
            console.error('Error fetching news detail:', error);
            return null;
          }
        }

        if (title && content && url) {
          return {
            title,
            content: content.length > 300 ? content.substring(0, 300) + '...' : content,
            url: `https://cryptopanic.com${url}`
          };
        }
        return null;
      })();

      newsPromises.push(newsPromise);
    });

    const newsResults = await Promise.all(newsPromises);
    const filteredResults = newsResults.filter((item): item is NewsItem => item !== null);
    
    console.log('Filtered news count:', filteredResults.length);
    return filteredResults;

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error scraping Cryptopanic:', error.message);
    }
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    console.log('Starting news fetch for query:', query);
    const news = await scrapeNews(query);
    console.log('News fetch completed, items:', news.length);

    return new NextResponse(JSON.stringify(news), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('News API Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch news' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 