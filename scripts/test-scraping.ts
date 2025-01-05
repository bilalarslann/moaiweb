import puppeteer from 'puppeteer';

async function scrapeNews() {
  let browser;
  try {
    const options = process.env.AWS_LAMBDA_FUNCTION_VERSION ? {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true
      },
      executablePath: '/usr/bin/chromium-browser',
      headless: true
    } : {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    };

    // Launch browser
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    
    // Try to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto('https://cryptonews.com/', { waitUntil: 'networkidle0' });
    
    const news = await page.evaluate(() => {
      const articles = document.querySelectorAll('article.mb-30');
      return Array.from(articles).map(article => {
        const titleElement = article.querySelector('a');
        const title = titleElement ? titleElement.textContent : '';
        const link = titleElement ? titleElement.href : '';
        return { title, link };
      });
    });

    console.log(news);
    return news;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeNews(); 