import { NextResponse } from 'next/server';
import axios from 'axios';
import cheerio, { Element } from 'cheerio';

interface NewsItem {
  title: string;
  url: string;
  content: string;
}

// HTTP istekleri için config
const axiosConfig = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://coinmarketcap.com/'
  },
  timeout: 30000,
  maxRedirects: 5
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin');

  if (!coin) {
    return NextResponse.json({ error: 'Coin parametresi gerekli' }, { status: 400 });
  }

  try {
    // CoinMarketCap'e git
    const url = `https://coinmarketcap.com/currencies/${coin}/news/`;
    console.log('Fetching URL:', url);
    
    const response = await axios.get(url, axiosConfig);
    
    if (response.status !== 200) {
      console.error('HTTP Error:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = response.data;
    if (!html) {
      console.error('Empty HTML response');
      throw new Error('Empty response from server');
    }
    
    // HTML'i parse et
    const $ = cheerio.load(html);
    const newsData: NewsItem[] = [];
    
    // Ana haber bölümünü bul
    const mainNewsSection = $('.sc-aef7b723-0');
    if (!mainNewsSection.length) {
      console.warn('Main news section not found, trying alternative selectors');
    }
    
    // Tüm haber elementlerini topla
    const allNewsElements = $('a').filter(function(this: Element) {
      const href = $(this).attr('href');
      const text = $(this).text().trim();
      return Boolean(href?.includes('/article/') && text.length > 20);
    });
    
    console.log('Found news elements:', allNewsElements.length);
    
    // İlk 5 haberi al
    allNewsElements.slice(0, 5).each(function(this: Element) {
      try {
        const title = $(this).text().trim();
        const link = $(this).attr('href');
        
        if (title && link) {
          const absoluteLink = link.startsWith('http') ? link : `https://coinmarketcap.com${link}`;
          newsData.push({ 
            title,
            url: absoluteLink,
            content: `${title} - Detaylı bilgi için linke tıklayın.`
          });
        }
      } catch (error) {
        console.warn('Error processing news item:', error);
      }
    });
    
    if (newsData.length === 0) {
      console.error('No news found after processing');
      return NextResponse.json({ error: 'Haber bulunamadı' }, { status: 404 });
    }

    console.log('Successfully fetched news:', newsData.length);
    return NextResponse.json(newsData);
    
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json({ 
      error: 'Haber çekme işlemi başarısız',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 