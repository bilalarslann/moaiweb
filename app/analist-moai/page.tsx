'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';

type Message = {
  type: 'user' | 'bot';
  content: string;
  chart?: {
    symbol: string;
    interval?: string;
  };
};

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// TradingView types
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
  }
}

// TradingView Widget Component
const TradingViewWidget = ({ symbol, interval = '1D' }: { symbol: string, interval?: string }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (typeof window.TradingView !== 'undefined') {
        new window.TradingView.widget({
          "width": "100%",
          "height": 400,
          "symbol": `BINANCE:${symbol}USDT`,
          "interval": interval,
          "timezone": "exchange",
          "theme": "dark",
          "style": "1",
          "locale": "tr",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": false,
          "save_image": false,
          "studies": [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies",
            "BB@tv-basicstudies",
            "PivotPointsHighLow@tv-basicstudies",
            "Support@tv-basicstudies",
            "Resistance@tv-basicstudies",
            "ZigZag@tv-basicstudies",
            "PivotPointsStandard@tv-basicstudies"
          ],
          "studies_overrides": {
            "pivotPointsHighLow.showLabels": true,
            "pivotPointsHighLow.levelLines.level1.color": "#2962ff",
            "pivotPointsHighLow.levelLines.level2.color": "#f44336",
            "pivotPointsHighLow.levelLines.level3.color": "#009688",
            "Support.linecolor": "#2962ff",
            "Support.linewidth": 2,
            "Resistance.linecolor": "#f44336",
            "Resistance.linewidth": 2,
            "PivotPointsStandard.color.support.1": "#2962ff",
            "PivotPointsStandard.color.support.2": "#009688",
            "PivotPointsStandard.color.resistance.1": "#f44336",
            "PivotPointsStandard.color.resistance.2": "#ff9800",
            "ZigZag.deviation": 5
          },
          "drawings_access": { 
            "type": "all",
            "tools": [
              {
                "name": "Support",
                "grayed": false
              },
              {
                "name": "Resistance",
                "grayed": false
              },
              {
                "name": "TrendLine",
                "grayed": false
              }
            ]
          },
          "container_id": `tradingview_${symbol}`
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget-container">
      <div id={`tradingview_${symbol}`} className="w-full h-[400px] rounded-xl overflow-hidden" />
    </div>
  );
};

export default function AnalistMoai() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Hello! I'm ANALYST MOAI 🗿\n\nI can analyze cryptocurrency markets. You can consult me for technical analysis, price predictions, and market insights.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');

  const placeholders = [
    "Can you do technical analysis for Bitcoin?",
    "What's the price target for Ethereum?",
    "Analyze BTC/USD chart",
    "How's the market looking?",
    "When will altcoin season start?",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    // Kullanıcı mesajını ekle
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // Mesajı analiz et ve kripto para sembolünü bul
      const symbolCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Verilen mesajdan kripto para sembolünü çıkar. Cevabı JSON formatında ver. 
            Örnek: { "symbol": "BTC", "showChart": true } veya { "symbol": null, "showChart": false }
            
            Eğer mesajda şu durumlardan biri varsa showChart true olmalı:
            - Grafik gösterme isteği
            - Teknik analiz isteği
            - Destek/direnç analizi isteği
            - Fiyat analizi isteği
            - Trend analizi isteği
            
            Örnek mesajlar ve cevapları:
            "Bitcoin grafiğini göster" -> { "symbol": "BTC", "showChart": true }
            "BTC nasıl?" -> { "symbol": "BTC", "showChart": true }
            "ETH grafiği" -> { "symbol": "ETH", "showChart": true }
            "Ethereum analiz" -> { "symbol": "ETH", "showChart": true }
            "Bitcoin'in destek ve direnç seviyeleri nedir?" -> { "symbol": "BTC", "showChart": true }
            "BTC için destek direnç çizer misin?" -> { "symbol": "BTC", "showChart": true }
            "Kripto paralar hakkında bilgi ver" -> { "symbol": null, "showChart": false }
            "Merhaba" -> { "symbol": null, "showChart": false }`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(symbolCompletion.choices[0]?.message?.content || "{}");
      const symbol = response.symbol;
      const showChart = response.showChart;

      // OpenAI API'ye istek at
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Sen ANALYST MOAI adında bir kripto para analisti yapay zeka asistanısın. 
            Kripto para piyasaları hakkında detaylı analizler yapabilirsin.
            
            Özellikle şu konularda uzmansın:
            - Teknik Analiz:
              * Destek/Direnç seviyeleri (Grafikte mavi, kırmızı ve yeşil çizgilerle gösteriliyor)
              * Trend analizi
              * Hareketli Ortalamalar (SMA göstergesi)
              * RSI (Göreceli Güç Endeksi)
              * Bollinger Bantları
            - Temel Analiz (Proje değerlendirmesi, piyasa koşulları, makro ekonomik faktörler)
            - Piyasa Psikolojisi (Korku/Açgözlülük endeksi, yatırımcı davranışları)
            - Risk Yönetimi (Stop-loss, pozisyon büyüklüğü, portföy çeşitlendirme)
            
            Grafikte gösterilen göstergeler:
            1. Destek/Direnç Seviyeleri:
               - 🔵 Mavi çizgi: Güçlü destek/direnç (Uzun süre test edilmiş, güvenilir seviyeler)
               - 🔴 Kırmızı çizgi: Orta seviye destek/direnç (Yakın zamanda oluşmuş önemli seviyeler)
               - 🟢 Yeşil çizgi: Zayıf destek/direnç (Kısa vadeli, geçici seviyeler)
            2. 📈 SMA (Basit Hareketli Ortalama): Trend yönünü belirlemede yardımcı
            3. 📊 RSI (Aşırı alım/satım seviyeleri): Momentum göstergesi
            4. 📉 Bollinger Bantları: Volatilite ve olası dönüş noktaları
            
            Destek/Direnç analizi yaparken:
            1. Önce grafiği göster
            2. Her renkteki seviyeleri açıkla
            3. Fiyatın hangi seviyelere yakın olduğunu belirt
            4. Olası senaryoları değerlendir
            5. Stop-loss önerilerinde bulun
            
            Her cevabının sonuna şu notu eklemelisin:
            "⚠️ Bu analizler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir. Kripto para piyasaları yüksek risk içerir. Yatırım kararlarınızı kendi araştırmalarınıza dayanarak vermelisiniz."
            
            Cevaplarında:
            1. Net ve anlaşılır ol
            2. Teknik terimleri açıkla
            3. Mümkünse sayısal veriler kullan
            4. Farklı senaryolara göre olasılıkları değerlendir
            5. Risk faktörlerini mutlaka belirt
            6. Destek/direnç seviyelerini emojilerle birlikte açıkla (🔵 mavi, 🔴 kırmızı, 🟢 yeşil)`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const botResponse = completion.choices[0]?.message?.content || "Sorry, an error occurred. Please try again.";
      
      // Bot mesajını ve grafiği ekle
      if (showChart && symbol) {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: botResponse,
          chart: {
            symbol: symbol
          }
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: botResponse
        }]);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Sorry, an error occurred. Please try again.'
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="w-full p-6 bg-black/30 backdrop-blur-sm border-b border-purple-900/30">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <a href="/" className="text-white hover:text-purple-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <div className="relative w-12 h-12 ring-2 ring-purple-500/50 rounded-full overflow-hidden shadow-lg shadow-purple-500/20">
            <Image
              src="/moai.webp"
              alt="MOAI"
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Analyst MOAI</h1>
            <p className="text-sm text-purple-300/80">Crypto Market Analyst</p>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-purple-600/50 hover:[&::-webkit-scrollbar-thumb]:bg-purple-500 [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-500/20'
                  : 'bg-gray-800/80 text-white rounded-bl-none shadow-lg shadow-black/20 backdrop-blur-sm'
              }`}
            >
              {message.content}
              {message.chart && (
                <div className="mt-4">
                  <TradingViewWidget symbol={message.chart.symbol} interval={message.chart.interval} />
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/80 text-white rounded-2xl rounded-bl-none p-4 max-w-[80%] animate-pulse shadow-lg shadow-black/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-purple-900/30 bg-black/30 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentPlaceholder}
            className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 font-medium"
          >
            {isLoading ? 'Analyzing...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
} 