'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';

type Message = {
  type: 'user' | 'bot';
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function GazeticiMoai() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Merhaba! Ben GAZETECİ MOAI 🗿\n\nSorularınızı yanıtlamaya hazırım. Kripto para, blockchain teknolojisi veya herhangi bir konuda bana soru sorabilirsiniz.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');

  const placeholders = [
    "Bitcoin nedir?",
    "Ethereum hakkında bilgi verir misin?",
    "Blockchain teknolojisi nasıl çalışır?",
    "NFT nedir?",
    "DeFi nedir?",
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
      // Mesajı analiz et ve anahtar kelimeleri bul
      const keywordCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Verilen mesajdan kripto para, blockchain teknolojisi veya finans ile ilgili en önemli anahtar kelimeyi çıkar ve mesajın haber talebi olup olmadığını belirt. Cevabı JSON formatında ver. Örnek: { 'keyword': 'bitcoin', 'isNewsRequest': true } veya { 'keyword': 'ethereum', 'isNewsRequest': false }. Haber talebi örnekleri: 'Bitcoin haberleri neler?', 'Ethereum ile ilgili son gelişmeler neler?', 'Ripple hakkında son haberler'. Eğer mesaj bir haber talebi değilse (örneğin: 'Bitcoin nedir?', 'Ethereum nasıl çalışır?') isNewsRequest false olmalı."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(keywordCompletion.choices[0]?.message?.content || "{}");
      const keyword = response.keyword?.toLowerCase();
      const isNewsRequest = response.isNewsRequest;

      if (keyword && keyword !== 'yok' && keyword !== 'bilinmiyor') {
        if (isNewsRequest) {
          // Haber talebi ise direkt haberleri göster
          setMessages(prev => [...prev, {
            type: 'bot',
            content: `🗞️ ${keyword.toUpperCase()} ile ilgili son gelişmeleri aktarıyorum:`
          }]);

          try {
            const response = await fetch('/api/scrape', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ searchQuery: keyword }),
            });

            const newsData = await response.json();

            if (Array.isArray(newsData) && newsData.length > 0) {
              newsData.forEach((news) => {
                setMessages(prev => [...prev, {
                  type: 'bot',
                  content: `📰 ${news.title}\n\n${news.content}`
                }]);
              });
            } else {
              setMessages(prev => [...prev, {
                type: 'bot',
                content: 'Üzgünüm, bu konuda güncel haber bulamadım.'
              }]);
            }
          } catch (error) {
            console.error('Haber çekme hatası:', error);
            setMessages(prev => [...prev, {
              type: 'bot',
              content: 'Üzgünüm, haberleri çekerken bir hata oluştu. Lütfen tekrar deneyin.'
            }]);
          }
        } else {
          // Haber talebi değilse normal OpenAI cevabı al
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "Sen GAZETECİ MOAI adında bir kripto para ve blockchain uzmanı yapay zeka asistanısın. Sorulara detaylı ve anlaşılır cevaplar vermelisin. Her zaman nazik ve yardımsever olmalısın. Cevaplarının sonuna 'Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.' notunu eklemelisin."
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            model: "gpt-3.5-turbo",
          });

          const botResponse = completion.choices[0]?.message?.content || "Üzgünüm, bir hata oluştu.";
          
          setMessages(prev => [...prev, {
            type: 'bot',
            content: botResponse + "\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir."
          }]);
        }
      } else {
        // Keyword bulunamadıysa normal OpenAI cevabı al
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "Sen GAZETECİ MOAI adında bir kripto para ve blockchain uzmanı yapay zeka asistanısın. Sorulara detaylı ve anlaşılır cevaplar vermelisin. Her zaman nazik ve yardımsever olmalısın. Cevaplarının sonuna 'Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.' notunu eklemelisin."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          model: "gpt-3.5-turbo",
        });

        const botResponse = completion.choices[0]?.message?.content || "Üzgünüm, bir hata oluştu.";
        
        setMessages(prev => [...prev, {
          type: 'bot',
          content: botResponse + "\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir."
        }]);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="w-full p-6 bg-black/30 backdrop-blur-sm border-b border-blue-900/30">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <a href="/" className="text-white hover:text-blue-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <div className="relative w-12 h-12 ring-2 ring-blue-500/50 rounded-full overflow-hidden shadow-lg shadow-blue-500/20">
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
            <p className="text-sm text-blue-300/80">Kripto & Blockchain Asistanı</p>
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
                  ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-500/20'
                  : 'bg-gray-800/80 text-white rounded-bl-none shadow-lg shadow-black/20 backdrop-blur-sm'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/80 text-white rounded-2xl rounded-bl-none p-4 max-w-[80%] animate-pulse shadow-lg shadow-black/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-900/30 bg-black/30 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={isLoading}
            className="flex-1 bg-gray-800/80 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 placeholder-gray-400 backdrop-blur-sm"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 font-medium"
          >
            {isLoading ? 'Yanıtlıyor...' : 'Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
} 