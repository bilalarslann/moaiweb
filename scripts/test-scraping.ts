import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

interface NewsItem {
  title: string;
  content: string;
  url: string;
}

async function scrapeNews(searchQuery: string): Promise<NewsItem[]> {
  let browser;
  try {
    console.log('Launching browser...');
    
    // Tarayıcı yapılandırması
    const options = process.env.AWS_LAMBDA_FUNCTION_VERSION ? {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    } : {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: "new"
    };

    // Tarayıcıyı başlat
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    
    // Bot tespitini engellemeye çalış
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Fetching news for query:', searchQuery);
    await page.goto(`https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Sayfanın yüklenmesi için bekle
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Sayfayı aşağı kaydır
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const newsItems: NewsItem[] = [];
    
    // İlk 5 haber için döngü
    for (let i = 0; i < 5; i++) {
      try {
        // Haber başlıklarını bul
        const titleElements = await page.$$('.title-text');
        console.log(`Found ${titleElements.length} title elements`);
        
        if (i >= titleElements.length) {
          console.log(`No more articles found (found ${titleElements.length} articles)`);
          break;
        }

        // Başlığı al ve tıkla
        const titleElement = titleElements[i];
        const title = await titleElement.evaluate((el: Element) => el.textContent || '');
        const parentLink = await titleElement.evaluateHandle((el: Element) => el.closest('a'));
        
        console.log(`Processing article ${i + 1}: ${title}`);
        
        // Başlığa tıkla ve yeni sayfanın yüklenmesini bekle
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
          parentLink.evaluate((el: Element) => (el as HTMLElement).click())
        ]);

        // İçeriği al
        await page.waitForSelector('.description-body', { timeout: 20000 });
        const contentElements = await page.$$('.description-body p');
        const contentParts = await Promise.all(
          contentElements.map(async (el: any) => {
            return el.evaluate((node: Element) => node.textContent || '');
          })
        );
        const content = contentParts.join('\n');

        // URL'yi al
        const url = page.url();

        if (title && content) {
          newsItems.push({
            title: title.trim(),
            content: content.trim(),
            url: url
          });
          console.log(`Successfully added article ${i + 1}`);
        }

        // Ana sayfaya geri dön
        await page.goBack({ waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000)); // Sayfanın yüklenmesi için bekle
        
      } catch (err) {
        console.error(`Error processing article ${i + 1}:`, err);
        // Hata durumunda ana sayfaya dönmeyi dene
        try {
          await page.goBack({ waitUntil: 'networkidle0', timeout: 60000 });
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (e) {
          console.error('Error navigating back:', e);
        }
        continue;
      }
    }

    console.log(`Successfully scraped ${newsItems.length} news items`);
    return newsItems;

  } catch (err: any) {
    console.error('Error scraping CryptoPanic:', err.message);
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
    console.log('-------------------');
  });
}

// Eğer doğrudan çalıştırılıyorsa test fonksiyonunu çalıştır
if (require.main === module) {
  main().catch(console.error);
}

// Export the scrapeNews function
export { scrapeNews }; 