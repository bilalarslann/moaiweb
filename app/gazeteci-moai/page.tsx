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
      content: `Hello! I'm JOURNALIST MOAI 🗿\n\nI'm ready to answer your questions. You can ask me about crypto currencies, blockchain technology, or any other topic.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');

  const placeholders = [
    "What is Bitcoin?",
    "Tell me about Ethereum",
    "How does blockchain work?",
    "What are NFTs?",
    "What is DeFi?",
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
            content: "Verilen mesajdan kripto para, blockchain teknolojisi veya finans ile ilgili en önemli anahtar kelimeyi çıkar. Sadece tek bir kelime olarak cevap ver. Örneğin: 'Bitcoin nedir?' -> 'bitcoin', 'Ethereum hakkında bilgi ver' -> 'ethereum', 'DeFi protokolleri nasıl çalışır?' -> 'defi'"
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const keyword = keywordCompletion.choices[0]?.message?.content?.toLowerCase();

      if (keyword && keyword !== 'yok' && keyword !== 'bilinmiyor') {
        // Anahtar kelime ile ilgili haberleri çek
        setMessages(prev => [...prev, {
          type: 'bot',
          content: `${botResponse}\n\n🔍 ${keyword.toUpperCase()} ile ilgili güncel haberleri arıyorum...`
        }]);

        const newsResponse = await fetch(`/api/news?query=${encodeURIComponent(keyword)}`);
        const newsData = await newsResponse.json();

        if (Array.isArray(newsData) && newsData.length > 0) {
          let newsContent = "\n\n📰 İşte konuyla ilgili son haberler:\n\n";
          newsData.forEach((news, index) => {
            newsContent += `${index + 1}. ${news.title}\n${news.content}\nKaynak: ${news.url}\n\n`;
          });

          setMessages(prev => [...prev.slice(0, -1), {
            type: 'bot',
            content: `${botResponse}${newsContent}\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.`
          }]);
        } else {
          setMessages(prev => [...prev.slice(0, -1), {
            type: 'bot',
            content: botResponse + "\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir."
          }]);
        }
      } else {
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
            <h1 className="text-xl font-bold text-white">Journalist MOAI</h1>
            <p className="text-sm text-blue-300/80">Crypto & Blockchain Assistant</p>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-blue-600/50 hover:[&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full">
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
            {isLoading ? 'Responding...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
} 