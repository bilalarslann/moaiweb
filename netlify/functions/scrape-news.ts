import { Handler } from '@netlify/functions';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface NewsItem {
  title: string;
  content: string;
  url: string;
}

async function scrapeNews(searchQuery: string): Promise<NewsItem[]> {
  try {
    const response = await axios.get(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const newsPromises: Promise<NewsItem | null>[] = [];

    // Her haber için promise oluştur
    $('.news-row').slice(0, 5).each((_, article) => {
      const titleElement = $(article).find('.title-text');
      const title = titleElement.text().trim();
      const url = titleElement.attr('href');
      const initialContent = $(article).find('.description-body').text().trim();

      const newsPromise = (async () => {
        let content = initialContent;

        // İçerik yoksa veya çok kısaysa haber detayına git
        if (!content || content.length < 50) {
          try {
            const detailResponse = await axios.get(`https://cryptopanic.com${url}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detail$ = cheerio.load(detailResponse.data);
            content = detail$('.description-body').text().trim();
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

    // Tüm haberleri paralel olarak çek
    const newsResults = await Promise.all(newsPromises);
    return newsResults.filter((item): item is NewsItem => item !== null);

  } catch (error) {
    console.error('Error scraping Cryptopanic:', error);
    return [];
  }
}

export const handler: Handler = async (event) => {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET'
    };

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    const searchQuery = event.queryStringParameters?.query || '';
    const news = await scrapeNews(searchQuery);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(news)
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 