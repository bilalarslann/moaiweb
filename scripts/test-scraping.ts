import puppeteer from 'puppeteer-core';

export async function scrapeNews(searchQuery?: string) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.CHROME_PATH || undefined
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const url = searchQuery 
      ? `https://cryptopanic.com/news?search=${encodeURIComponent(searchQuery)}`
      : 'https://cryptopanic.com/news/';

    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const titleElements = await page.$$('.title-text');
    const titles = await Promise.all(
      titleElements.map(el => el.evaluate(node => node.textContent))
    );

    console.log('Found titles:', titles);
    return titles;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Only run if this is the main module
if (require.main === module) {
  scrapeNews()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 