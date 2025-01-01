const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

interface NewsItem {
  title: string;
  content: string;
  url: string;
}

async function scrapeNews(searchQuery: string): Promise<NewsItem[]> {
  let browser;
  try {
    console.log('Launching browser...');
    
    // Netlify Functions için özel yapılandırma
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Bot tespitini engellemeye çalış
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // JavaScript değişkenini override et
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Fetching news for query:', searchQuery);
    await page.goto(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle0',
      timeout: 15000 // Netlify'da timeout süresini kısalttık
    });

    // Sayfanın yüklenmesi için bekle
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const newsItems: NewsItem[] = [];
    let processedCount = 0;
    
    while (processedCount < 5) {
      // title-text elementlerini bul
      console.log('Looking for news items...');
      const titleElements = await page.$$('.title-text');
      
      if (titleElements.length === 0 || processedCount >= titleElements.length) {
        console.log('No more news items found');
        break;
      }
      
      // Mevcut haberi işle
      try {
        const titleElement = titleElements[processedCount];
        const title = await page.evaluate((el: Element) => el.textContent, titleElement);
        const url = await page.evaluate((el: Element) => el.getAttribute('href'), titleElement);
        
        console.log(`Processing news item ${processedCount + 1}: ${title}`);
        
        // Yeni sekmede haberi aç
        const newPage = await browser.newPage();
        await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        await newPage.goto(`https://cryptopanic.com${url}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        // İçeriğin yüklenmesini bekle
        await newPage.waitForSelector('.description-body', { timeout: 5000 });
        
        // İçeriği al
        const content = await newPage.$eval('.description-body', (el: Element) => el.textContent || '');
        
        // Sekmeyi kapat
        await newPage.close();
        
        newsItems.push({
          title: title?.trim() || '',
          content: (content?.trim() || '').length > 300 ? content.trim().substring(0, 300) + '...' : content.trim(),
          url: url ? `https://cryptopanic.com${url}` : ''
        });
        
        console.log(`Successfully scraped news item ${processedCount + 1}`);
        processedCount++;
        
      } catch (err) {
        console.error('Error processing news item:', err);
        processedCount++; // Hata olsa bile devam et
      }
    }

    console.log(`Successfully scraped ${newsItems.length} news items`);
    return newsItems;

  } catch (err: any) {
    console.error('Error scraping Cryptopanic:', err.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Test fonksiyonu
async function main() {
  const searchQuery = process.argv[2] || 'bitcoin';
  console.log(`Testing scraping for query: ${searchQuery}`);
  
  const news = await scrapeNews(searchQuery);
  console.log('\nResults:');
  news.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.title}`);
    console.log(`Content: ${item.content}`);
    console.log(`URL: ${item.url}`);
  });
}

// Eğer doğrudan çalıştırılıyorsa test fonksiyonunu çalıştır
if (require.main === module) {
  main().catch(console.error);
}

// Netlify Functions için export
export { scrapeNews }; 