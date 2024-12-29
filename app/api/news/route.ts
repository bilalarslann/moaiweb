import { NextResponse } from 'next/server';
import puppeteer, { ElementHandle, Page } from 'puppeteer-core';
import chrome from '@sparticuz/chromium';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin');

  if (!coin) {
    return NextResponse.json({ error: 'Coin parametresi gerekli' }, { status: 400 });
  }

  let browser;
  try {
    // Browser ayarları
    const executablePath = process.env.CHROME_EXECUTABLE_PATH || await chrome.executablePath;
    
    browser = await puppeteer.launch({
      args: [...chrome.args, '--hide-scrollbars', '--disable-web-security'],
      executablePath: executablePath as string,
      headless: true
    });

    const page = await browser.newPage();
    
    // CoinMarketCap'e git
    await page.goto(`https://coinmarketcap.com/currencies/${coin}/news/`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Sayfayı aşağı kaydır
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));

    // Haber başlıklarını bul
    const newsElements = await page.$$(`.sc-65e7f566-0.cUjpUw.news_title.top-news-title, .sc-65e7f566-0.cUjpUw.news_title`);
    const newsData = [];

    // İlk 5 haberi al
    for (let i = 0; i < Math.min(5, newsElements.length); i++) {
      try {
        const titleElement = newsElements[i];
        const title = await page.evaluate(el => el.textContent, titleElement);
        
        // Habere tıkla
        await titleElement.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Yeni sayfada scroll
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 2000));
        
        // Haber içeriğini al
        const content = await page.evaluate(() => {
          const element = document.querySelector('.sc-aef7b723-0');
          return element ? element.textContent : null;
        });
        
        if (title && content) {
          newsData.push({ title, content });
        }
        
        // Ana sayfaya dön
        await page.goBack({
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error(`${i + 1}. başlık işlenirken hata oluştu:`, error);
        continue;
      }
    }

    return NextResponse.json(newsData);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Haber çekme işlemi başarısız' }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 