"use client";

import { useState } from 'react';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Message {
  type: 'user' | 'bot';
  content: string;
}

interface NewsItem {
  title: string;
  content: string;
  url: string;
}

export default function GazeticiMoai() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    // Kullanıcı mesajını ekle
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // OpenAI API'ye istek at
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Sen GAZETECİ MOAI adında bir kripto para ve blockchain uzmanı yapay zeka asistanısın. Sorulara detaylı ve anlaşılır cevaplar vermelisin. Her zaman nazik ve yardımsever olmalısın. Eğer bir kripto para, blockchain teknolojisi veya kavram hakkında soru sorulursa, önce o konuyla ilgili haberleri kontrol etmelisin. Cevaplarının sonuna 'Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.' notunu eklemelisin."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const botResponse = completion.choices[0]?.message?.content || "Üzgünüm, bir hata oluştu.";
      
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
          content: `${botResponse}\n\n🔍 ${keyword.toUpperCase()} ile ilgili en iyi haberler bulunuyor...`
        }]);

        try {
          const newsResponse = await axios.get(`/api/news?query=${encodeURIComponent(keyword)}`);
          const newsData = newsResponse.data;

          if (Array.isArray(newsData) && newsData.length > 0) {
            let newsContent = "\n\n📰 İşte konuyla ilgili en güncel haberler:\n\n";
            newsData.forEach((news, index) => {
              newsContent += `${index + 1}. ${news.title}\n${news.content}\nKaynak: ${news.url}\n\n`;
            });

            setMessages(prev => [...prev.slice(0, -1), {
              type: 'bot',
              content: `${botResponse}${newsContent}\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.`
            }]);
          } else {
            setMessages(prev => [...prev.slice(0, -1), {
              type: 'bot',
              content: `${botResponse}\n\n❌ Üzgünüm, ${keyword.toUpperCase()} ile ilgili güncel haber bulamadım.\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.`
            }]);
          }
        } catch (error) {
          console.error('News fetch error:', error);
          setMessages(prev => [...prev.slice(0, -1), {
            type: 'bot',
            content: `${botResponse}\n\n❌ Üzgünüm, haberleri getirirken bir hata oluştu.\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.`
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
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.type === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-4 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">
                {message.content}
              </pre>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-500 text-white rounded ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Yanıt Bekliyor...' : 'Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
} 