'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';
import { useSearchParams } from 'next/navigation';

type Message = {
  type: 'user' | 'bot';
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function JournalistMoai() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const detectLanguage = (text: string) => {
    // Basic language detection - if contains Turkish characters, assume Turkish
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
    return turkishChars.test(text) ? 'tr' : 'en';
  };

  const getInitialMessage = (lang: string) => {
    return lang === 'tr' 
      ? "Merhaba! Ben Journalist MOAI. Kripto haberleri ve piyasa verilerini takip ediyorum. Hangi konu hakkında bilgi almak istersiniz?"
      : "Hello! I'm Journalist MOAI. I track crypto news and market data. What would you like to know about?";
  };

  const getNewsPrompt = (query: string, lang: string) => {
    return lang === 'tr'
      ? `🗞️ ${query.toUpperCase()} hakkında en son haberleri getiriyorum.`
      : `🗞️ Bringing you the latest news for ${query.toUpperCase()}.`;
  };

  useEffect(() => {
    const initialMessage = getInitialMessage(detectLanguage(navigator.language));
    setMessages([{ role: 'assistant', content: initialMessage }]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userLang = detectLanguage(input);
    const userMessage = { role: 'user', content: input };
    const loadingMessage = { role: 'assistant', content: getNewsPrompt(input, userLang) };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, language: userLang })
      });

      if (!response.ok) throw new Error('Failed to fetch news');

      const data = await response.json();
      const newsMessage = { role: 'assistant', content: data.content };
      
      setMessages(prev => [...prev.slice(0, -1), newsMessage]);
    } catch (error) {
      const errorMessage = userLang === 'tr'
        ? "Üzgünüm, haberleri getirirken bir hata oluştu. Lütfen tekrar deneyin."
        : "Sorry, there was an error fetching the news. Please try again.";
      
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 bg-black text-white">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-gray-900/50 rounded-lg p-4 mb-4 h-[calc(100vh-250px)] overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                } max-w-[80%]`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={detectLanguage(navigator.language) === 'tr' ? "Bir mesaj yazın..." : "Type a message..."}
            className="flex-1 p-4 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isLoading}
          >
            {detectLanguage(navigator.language) === 'tr' ? "Gönder" : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
} 