import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

// HTTP istekleri için config
const axiosConfig = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  },
  timeout: 10000
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin');

  if (!coin) {
    return NextResponse.json({ error: 'Coin parametresi gerekli' }, { status: 400 });
  }

  try {
    // CoinMarketCap'e git
    const url = `https://coinmarketcap.com/currencies/${coin}/news/`;
    const response = await axios.get(url, axiosConfig);
    
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = response.data;
    
    // HTML'i parse et
    const $ = cheerio.load(html);
    const newsData = [];
    
    // Haber başlıklarını bul (birden fazla seçici dene)
    const newsElements = $(
      '.sc-65e7f566-0.cUjpUw.news_title.top-news-title, ' + 
      '.sc-65e7f566-0.cUjpUw.news_title, ' +
      '.cmc-link'
    ).filter(function() {
      return $(this).text().trim().length > 0;
    });
    
    if (newsElements.length === 0) {
      return NextResponse.json({ error: 'Haber bulunamadı' }, { status: 404 });
    }
    
    // İlk 5 haberi al
    for (let i = 0; i < Math.min(5, newsElements.length); i++) {
      try {
        const element = newsElements[i];
        const title = $(element).text().trim();
        const link = $(element).closest('a').attr('href');
        
        if (!title || !link) {
          console.warn(`${i + 1}. haber için başlık veya link bulunamadı`);
          continue;
        }
        
        // Göreceli linki mutlak linke çevir
        const absoluteLink = link.startsWith('http') ? link : `https://coinmarketcap.com${link}`;
        
        // Haber sayfasına git
        const articleResponse = await axios.get(absoluteLink, axiosConfig);
        
        if (articleResponse.status !== 200) {
          throw new Error(`Article HTTP error! status: ${articleResponse.status}`);
        }
        
        const article$ = cheerio.load(articleResponse.data);
        
        // Haber içeriğini al (birden fazla seçici dene)
        const content = article$('.sc-aef7b723-0, .news-description, article p').text().trim();
        
        if (content) {
          newsData.push({ 
            title, 
            content,
            url: absoluteLink 
          });
        } else {
          console.warn(`${i + 1}. haber için içerik bulunamadı`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`${i + 1}. başlık işlenirken hata oluştu:`, error);
        continue;
      }
    }
    
    if (newsData.length === 0) {
      return NextResponse.json({ error: 'Haberler alınamadı' }, { status: 500 });
    }

    return NextResponse.json(newsData);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Haber çekme işlemi başarısız',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 