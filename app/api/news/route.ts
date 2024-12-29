import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin');

  if (!coin) {
    return NextResponse.json({ error: 'Coin parametresi gerekli' }, { status: 400 });
  }

  try {
    // CoinMarketCap'e git
    const url = `https://coinmarketcap.com/currencies/${coin}/news/`;
    const response = await axios.get(url);
    const html = response.data;
    
    // HTML'i parse et
    const $ = cheerio.load(html);
    const newsData = [];
    
    // Haber başlıklarını bul
    const newsElements = $('.sc-65e7f566-0.cUjpUw.news_title.top-news-title, .sc-65e7f566-0.cUjpUw.news_title');
    
    // İlk 5 haberi al
    for (let i = 0; i < Math.min(5, newsElements.length); i++) {
      try {
        const element = newsElements[i];
        const title = $(element).text().trim();
        const link = $(element).closest('a').attr('href');
        
        if (link) {
          // Haber sayfasına git
          const articleResponse = await axios.get(`https://coinmarketcap.com${link}`);
          const article$ = cheerio.load(articleResponse.data);
          
          // Haber içeriğini al
          const content = article$('.sc-aef7b723-0').text().trim();
          
          if (title && content) {
            newsData.push({ title, content });
          }
        }
      } catch (error) {
        console.error(`${i + 1}. başlık işlenirken hata oluştu:`, error);
        continue;
      }
    }

    return NextResponse.json(newsData);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Haber çekme işlemi başarısız' }, { status: 500 });
  }
} 