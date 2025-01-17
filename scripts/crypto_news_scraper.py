import requests
import openai
import json
from datetime import datetime
import os

# Replace the API key with a placeholder
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# OpenAI API anahtarını ayarla
openai.api_key = OPENAI_API_KEY

# OpenAI client'ı oluştur
client = openai.OpenAI(
    api_key=OPENAI_API_KEY
)

# API Gateway URL'i
API_GATEWAY_URL = 'http://localhost:3001/api/coingecko'

# Coin ID eşleştirmeleri
COIN_ID_MAP = {
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'arbitrum': 'arbitrum',
    'solana': 'solana',
    'avalanche': 'avalanche-2',
    'cardano': 'cardano',
    'polkadot': 'polkadot'
}

def get_coin_data(coin_name):
    if coin_name not in COIN_ID_MAP:
        print(f"Hata: {coin_name} desteklenen coinler arasında değil.")
        print("Desteklenen coinler:", ", ".join(COIN_ID_MAP.keys()))
        return None
    
    coin_id = COIN_ID_MAP[coin_name]
    news_data = []
    
    try:
        # Fiyat ve market verilerini al
        price_url = f'{API_GATEWAY_URL}/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true'
        price_response = requests.get(price_url)
        price_data = price_response.json()[coin_id]
        
        # Coin detaylarını al
        info_url = f'{API_GATEWAY_URL}/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false'
        info_response = requests.get(info_url)
        coin_info = info_response.json()
        
        # Verileri haber formatında düzenle
        news_data.append({
            'title': 'Güncel Fiyat ve Değişim',
            'content': f"Şu anki fiyat: ${price_data['usd']:.2f}\n" +
                      f"24 saatlik değişim: {price_data['usd_24h_change']:.2f}%\n" +
                      f"Son güncelleme: {datetime.fromtimestamp(price_data['last_updated_at']).strftime('%H:%M:%S')}"
        })
        
        news_data.append({
            'title': 'Piyasa Bilgisi',
            'content': f"Piyasa Değeri Sıralaması: #{coin_info['market_cap_rank']}\n" +
                      f"Piyasa Değeri: ${coin_info['market_data']['market_cap']['usd']:,.2f}\n" +
                      f"24s İşlem Hacmi: ${coin_info['market_data']['total_volume']['usd']:,.2f}"
        })
        
        if coin_info['description']['en']:
            news_data.append({
                'title': 'Coin Hakkında',
                'content': coin_info['description']['en'][:1000] + '...' if len(coin_info['description']['en']) > 1000 else coin_info['description']['en']
            })
        
        print(f"{len(news_data)} veri noktası toplandı.")
        return news_data
        
    except Exception as e:
        print(f"Veri alınırken hata oluştu: {str(e)}")
        return None

def summarize_news(news_data):
    if not news_data:
        return "Veri bulunamadı."
    
    # Verileri birleştir
    news_text = "\n\n".join([
        f"Başlık: {news['title']}\nİçerik: {news['content']}"
        for news in news_data
    ])
    
    try:
        # OpenAI ile özet çıkar
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {
                    "role": "system",
                    "content": "Sen bir kripto para analisti olan MOAI'sin. Verilen coin verilerini ve açıklamaları analiz edip kısa ve öz bir özet çıkar. Teknik analiz ve önemli noktaları vurgula."
                },
                {
                    "role": "user",
                    "content": f"Şu verileri analiz et ve özetle:\n\n{news_text}"
                }
            ]
        )
        
        summary = response.choices[0].message.content
        return summary + "\n\nBu sadece bilgilendirme amaçlıdır, yatırım tavsiyesi değildir."
    
    except Exception as e:
        print(f"OpenAI hatası: {str(e)}")
        return "Özet oluşturulurken bir hata oluştu."

def main():
    print("Desteklenen coinler:", ", ".join(COIN_ID_MAP.keys()))
    coin_name = input("\nHangi coin hakkında bilgi almak istersiniz?: ")
    print("\nVeriler toplanıyor...")
    
    news_data = get_coin_data(coin_name.lower())
    
    if news_data:
        print("\nVeriler analiz ediliyor...")
        summary = summarize_news(news_data)
        print("\nÖzet:")
        print(summary)
    else:
        print("\nVeri bulunamadı veya bir hata oluştu.")

if __name__ == "__main__":
    main() 