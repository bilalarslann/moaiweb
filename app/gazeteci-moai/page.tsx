'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';

// Initialize OpenAI client on the client side only
const openai = typeof window !== 'undefined' ? new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
}) : null;

// Solana adresi kontrolü için regex - Base58 karakterleri ve uzunluk kontrolü
const SOLANA_ADDRESS_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

// Adresi temizle ve kontrol et
function extractSolanaAddress(text: string): string | null {
  // Olası adres formatları:
  // 1. Düz adres: 2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M
  // 2. URL içinde: https://solscan.io/token/2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M
  // 3. Metin içinde: "contract adresi: 2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M"

  // URL'den adresi çıkar
  const urlMatch = text.match(/(?:token\/|address\/)([\w\d]{32,44})/i);
  if (urlMatch) return urlMatch[1];

  // Düz adresi bul
  const addressMatch = text.match(SOLANA_ADDRESS_REGEX);
  if (addressMatch) return addressMatch[0];

  return null;
}

type Message = {
  type: 'user' | 'bot';
  content: string;
};

type CoinData = {
  title: string;
  content: string;
};

type CoinList = {
  [key: string]: {
    id: string;
    symbol: string;
    name: string;
  };
};

async function searchCoin(query: string): Promise<string | null> {
  try {
    // CoinGecko'dan coin listesini al
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
    const coins = await response.json();
    
    // Arama sorgusunu küçük harfe çevir
    const searchQuery = query.toLowerCase();
    
    // Coin'i bul (isim, sembol veya id ile eşleşen)
    const coin = coins.find((c: any) => 
      c.id.toLowerCase() === searchQuery ||
      c.symbol.toLowerCase() === searchQuery ||
      c.name.toLowerCase() === searchQuery
    );
    
    return coin ? coin.id : null;
  } catch (error) {
    console.error('CoinGecko API Error:', error);
    return null;
  }
}

async function getCoinData(coinId: string): Promise<CoinData[] | null> {
  try {
    // Fiyat ve market verilerini al
    const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`);
    const priceData = await priceResponse.json();
    
    // Coin detaylarını al
    const infoResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
    const coinInfo = await infoResponse.json();

    const data: CoinData[] = [];
    
    // Fiyat bilgisi
    data.push({
      title: 'Güncel Fiyat ve Değişim',
      content: `Şu anki fiyat: $${priceData[coinId].usd.toFixed(8)}\n` +
               `24 saatlik değişim: ${priceData[coinId].usd_24h_change?.toFixed(2) || 'N/A'}%\n` +
               `Son güncelleme: ${new Date(priceData[coinId].last_updated_at * 1000).toLocaleTimeString()}`
    });

    // Piyasa bilgisi
    data.push({
      title: 'Piyasa Bilgisi',
      content: `Piyasa Değeri Sıralaması: #${coinInfo.market_cap_rank || 'N/A'}\n` +
               `Piyasa Değeri: $${coinInfo.market_data.market_cap.usd?.toLocaleString() || 'N/A'}\n` +
               `24s İşlem Hacmi: $${coinInfo.market_data.total_volume.usd?.toLocaleString() || 'N/A'}\n` +
               `Dolaşımdaki Arz: ${coinInfo.market_data.circulating_supply?.toLocaleString() || 'N/A'} ${coinInfo.symbol.toUpperCase()}\n` +
               `Maksimum Arz: ${coinInfo.market_data.max_supply?.toLocaleString() || 'Sınırsız'} ${coinInfo.symbol.toUpperCase()}`
    });

    // Coin açıklaması
    if (coinInfo.description?.en) {
      data.push({
        title: 'Coin Hakkında',
        content: coinInfo.description.en.length > 1000 
          ? coinInfo.description.en.slice(0, 1000) + '...'
          : coinInfo.description.en
      });
    }

    // Sosyal medya ve linkler
    const links = [];
    if (coinInfo.links?.homepage?.[0]) links.push(`Website: ${coinInfo.links.homepage[0]}`);
    if (coinInfo.links?.blockchain_site?.[0]) links.push(`Explorer: ${coinInfo.links.blockchain_site[0]}`);
    if (coinInfo.links?.twitter_screen_name) links.push(`Twitter: @${coinInfo.links.twitter_screen_name}`);
    if (coinInfo.links?.telegram_channel_identifier) links.push(`Telegram: ${coinInfo.links.telegram_channel_identifier}`);
    
    if (links.length > 0) {
      data.push({
        title: 'Linkler',
        content: links.join('\n')
      });
    }

    return data;
  } catch (error) {
    console.error('CoinGecko API Error:', error);
    return null;
  }
}

async function getSolanaTokenData(address: string): Promise<CoinData[] | null> {
  try {
    // DexScreener API'den token verilerini al
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      throw new Error('Token bulunamadı');
    }

    // En iyi likiditeye sahip pair'i seç
    const bestPair = data.pairs.reduce((best: any, current: any) => {
      return (best.liquidity?.usd || 0) > (current.liquidity?.usd || 0) ? best : current;
    });

    const tokenData: CoinData[] = [];

    // Token bilgileri
    tokenData.push({
      title: 'Token Bilgileri',
      content: `İsim: ${bestPair.baseToken.name}\n` +
               `Sembol: ${bestPair.baseToken.symbol}\n` +
               `Güncel Fiyat: $${Number(bestPair.priceUsd).toFixed(12)}\n` +
               `24s Değişim: ${bestPair.priceChange.h24 || 'N/A'}%\n` +
               `Token Adresi: ${address}`
    });

    // Market bilgileri
    tokenData.push({
      title: 'Market Bilgileri',
      content: `24s İşlem Hacmi: $${Number(bestPair.volume.h24).toLocaleString()}\n` +
               `Toplam Likidite: $${Number(bestPair.liquidity.usd).toLocaleString()}\n` +
               `En İyi Market: ${bestPair.dexId}\n` +
               `İşlem Çifti: ${bestPair.baseToken.symbol}/${bestPair.quoteToken.symbol}\n` +
               `Son Güncelleme: ${new Date(bestPair.pairCreatedAt).toLocaleString()}`
    });

    // Güvenlik bilgileri
    const warnings = [];
    if (Number(bestPair.liquidity.usd) < 10000) warnings.push("⚠️ Düşük likidite");
    if (Number(bestPair.volume.h24) < 1000) warnings.push("⚠️ Düşük işlem hacmi");
    if (bestPair.priceChange.h24 && Math.abs(Number(bestPair.priceChange.h24)) > 20) warnings.push("⚠️ Yüksek volatilite");

    tokenData.push({
      title: 'Güvenlik Analizi',
      content: warnings.length > 0 
        ? `Riskler:\n${warnings.join('\n')}\n\nDikkat: Bu token yüksek risk içerebilir.`
        : `✅ Temel güvenlik kriterlerini karşılıyor.\nAncak yine de kendi araştırmanızı yapın.`
    });

    // Explorer linkleri
    tokenData.push({
      title: 'İşlem Linkleri',
      content: `DexScreener: https://dexscreener.com/solana/${address}\n` +
               `Raydium: https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${address}\n` +
               `Jupiter: https://jup.ag/swap/${address}\n` +
               `Birdeye: https://birdeye.so/token/${address}`
    });

    return tokenData;
  } catch (error) {
    console.error('DexScreener API Error:', error);
    return null;
  }
}

// Token analizi için prompt
const tokenSystemPrompt = `Sen MOAI 🗿 adında bir Solana token analistisin. 
Verilen token verilerini tek bir paragrafta özetleyeceksin.

Özette şunlara değin:
- Token'in ismi ve amacı
- Güncel fiyat durumu
- Likidite ve işlem hacmi
- Varsa risk faktörleri

Yazım tarzın:
- Tek paragraf (3-4 cümle)
- Samimi ve net bir dil
- En kritik bilgilere odaklan
- Gerekirse emoji kullan (🗿)`;

// Coin analizi için prompt
const coinSystemPrompt = `Sen MOAI 🗿 adında bir kripto para analistisin. 
Verilen coin verilerini tek bir paragrafta özetleyeceksin.

Özette şunlara değin:
- Coin'in temel kullanım alanı
- Güncel fiyat ve piyasa durumu
- Öne çıkan metrikler
- Dikkat edilmesi gereken noktalar

Yazım tarzın:
- Tek paragraf (3-4 cümle)
- Samimi ve net bir dil
- En kritik bilgilere odaklan
- Gerekirse emoji kullan (🗿)`;

export default function GazeticiMoai() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Merhaba! Ben MOAI 🗿\n\nKripto dünyasındaki gelişmeleri takip ediyor, coin ve token analizleri yapıyorum. Bana istediğin coin'i veya token adresini sorabilirsin.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');

  // Optimize placeholders with useMemo
  const placeholders = useMemo(() => [
    "Bitcoin nedir?",
    "ETH analiz",
    "SOL hakkında bilgi ver",
    "AVAX coin",
    "2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M",
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [placeholders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    // Kullanıcı mesajını ekle
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      let botResponse;
      const words = userMessage.toLowerCase().split(/\s+/);

      // Solana adresi kontrolü
      const solanaAddress = extractSolanaAddress(userMessage);
      
      if (solanaAddress) {
        // Solana token verilerini al
        const tokenData = await getSolanaTokenData(solanaAddress);
        
        if (tokenData) {
          // OpenAI ile analiz et
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: tokenSystemPrompt
              },
              {
                role: "user",
                content: tokenData.map(data => `${data.title}:\n${data.content}`).join('\n\n')
              }
            ],
            model: "gpt-4-1106-preview",
            max_tokens: 150,
            temperature: 0.7,
          });

          botResponse = completion.choices[0]?.message?.content + "\n\n⚠️ Not: Yatırım tavsiyesi değildir.";
        } else {
          botResponse = "Üzgünüm, bu Solana token adresi için veri bulunamadı veya geçersiz bir adres.";
        }
      } else {
        // Önce coin araması için kontrol et
        let coinId = null;
        for (const word of words) {
          if (['coin', 'hakkında', 'analiz', 'nedir', 'ver', 'bilgi'].includes(word)) continue;
          coinId = await searchCoin(word);
          if (coinId) break;
        }

        if (coinId) {
          const coinData = await getCoinData(coinId);
          
          if (coinData) {
            const completion = await openai.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: coinSystemPrompt
                },
                {
                  role: "user",
                  content: coinData.map(data => `${data.title}:\n${data.content}`).join('\n\n')
                }
              ],
              model: "gpt-4-1106-preview",
              max_tokens: 150,
              temperature: 0.7,
            });

            botResponse = completion.choices[0]?.message?.content + "\n\n⚠️ Not: Yatırım tavsiyesi değildir.";
          } else {
            botResponse = "Üzgünüm, coin verileri alınırken bir hata oluştu.";
          }
        } else {
          // Genel sohbet için OpenAI'yi kullan
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `Sen MOAI 🗿 adında bir kripto para analisti ve sohbet botusun. 
                Karakterin:
                - Kripto dünyasına çok hakimsin ve her konuşmada bunu yansıtıyorsun
                - Arkadaş canlısı ve samimi bir tarzın var
                - Emoji kullanmayı seviyorsun (özellikle 🗿)
                - Her fırsatta konuyu kripto paralar, blockchain ve yatırımlara bağlıyorsun
                - Kısa ve öz cevaplar veriyorsun
                - Teknik terimleri basitleştirerek anlatıyorsun
                - Sohbet ederken bile eğitici olmaya çalışıyorsun
                
                Önemli: Cevapların 3 cümleyi geçmemeli ve mutlaka kripto dünyasıyla bağlantı kurmalı.`
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            model: "gpt-4-1106-preview",
            max_tokens: 150,
            temperature: 0.7,
          });

          botResponse = completion.choices[0]?.message?.content;
        }
      }

      // Bot cevabını ekle
      setMessages(prev => [...prev, {
        type: 'bot',
        content: botResponse || 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <header className="w-full p-6 bg-black/50 backdrop-blur-sm border-b border-blue-900/30">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <a href="/" className="text-white hover:text-blue-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <div className="relative w-12 h-12 ring-2 ring-blue-600/50 rounded-full overflow-hidden">
            <Image
              src="/moai.webp"
              alt="MOAI"
              width={48}
              height={48}
              className="rounded-full object-cover hover:scale-110 transition-transform duration-200"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gazeteci MOAI</h1>
            <p className="text-sm text-gray-400">Coin Analiz Botu</p>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-800 text-white rounded-bl-none'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-white rounded-2xl rounded-bl-none p-4 max-w-[80%] animate-pulse">
              Yazıyor...
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 58, 138, 0.1);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.8);
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 1);
        }
      `}</style>

      {/* Input Area */}
      <div className="border-t border-blue-900/30 bg-black/50 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
} 