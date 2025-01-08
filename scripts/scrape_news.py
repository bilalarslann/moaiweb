import sys
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def scrape_news(coin_name):
    # Chrome ayarlarını yapılandır
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless')  # Başsız mod
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    try:
        # WebDriver'ı başlat
        driver = webdriver.Chrome(options=chrome_options)
        
        # CoinMarketCap'e git
        url = f"https://coinmarketcap.com/currencies/{coin_name}/news/"
        driver.get(url)
        
        # Sayfanın yüklenmesi için bekle
        time.sleep(2)
        
        # Sayfayı aşağı kaydır
        driver.execute_script("window.scrollBy(0, 1000);")
        time.sleep(2)
        
        # Haber başlıklarını bul
        news_elements = driver.find_elements(By.CSS_SELECTOR, ".sc-65e7f566-0.cUjpUw.news_title.top-news-title, .sc-65e7f566-0.cUjpUw.news_title")
        
        news_data = []
        
        for i, news in enumerate(news_elements[:5], 1):  # İlk 5 haberi al
            try:
                title = news.text
                news.click()
                time.sleep(2)
                
                # Yeni sayfada scroll
                driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(2)
                
                # Haber içeriğini al
                content = driver.find_element(By.CLASS_NAME, "sc-aef7b723-0").text
                
                news_data.append({
                    "title": title,
                    "content": content
                })
                
                # Ana sayfaya dön
                driver.back()
                time.sleep(2)
                
            except Exception as e:
                print(f"{i}. başlık işlenirken hata oluştu: {str(e)}", file=sys.stderr)
                continue
        
        return news_data
        
    except Exception as e:
        print(f"Hata oluştu: {str(e)}", file=sys.stderr)
        return []
        
    finally:
        driver.quit()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Coin adı gerekli!", file=sys.stderr)
        sys.exit(1)
        
    coin_name = sys.argv[1]
    news_data = scrape_news(coin_name)
    print(json.dumps(news_data, ensure_ascii=False)) 