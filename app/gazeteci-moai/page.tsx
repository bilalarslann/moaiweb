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
<<<<<<< HEAD
      content: `Hello! I'm JOURNALIST MOAI 🗿\n\nI'm ready to answer your questions. You can ask me about crypto currencies, blockchain technology, or any other topic.`
=======
      content: `Merhaba! Ben GAZETECİ MOAI 🗿\n\nSorularınızı yanıtlamaya hazırım. Kripto para, blockchain teknolojisi veya herhangi bir konuda bana soru sorabilirsiniz.`
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');

  const placeholders = [
<<<<<<< HEAD
    "What is Bitcoin?",
    "Tell me about Ethereum",
    "How does blockchain work?",
    "What are NFTs?",
    "What is DeFi?",
=======
    "Bitcoin nedir?",
    "Ethereum hakkında bilgi verir misin?",
    "Blockchain teknolojisi nasıl çalışır?",
    "NFT nedir?",
    "DeFi nedir?",
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
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
<<<<<<< HEAD
=======
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
      
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
      // Mesajı analiz et ve anahtar kelimeleri bul
      const keywordCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
<<<<<<< HEAD
            content: "Verilen mesajdan kripto para, blockchain teknolojisi veya finans ile ilgili en önemli anahtar kelimeyi çıkar ve mesajın haber talebi olup olmadığını belirt. Cevabı JSON formatında ver. Örnek: { 'keyword': 'bitcoin', 'isNewsRequest': true } veya { 'keyword': 'ethereum', 'isNewsRequest': false }. Haber talebi örnekleri: 'Bitcoin haberleri neler?', 'Ethereum ile ilgili son gelişmeler neler?', 'Ripple hakkında son haberler'. Eğer mesaj bir haber talebi değilse (örneğin: 'Bitcoin nedir?', 'Ethereum nasıl çalışır?') isNewsRequest false olmalı."
=======
            content: "Verilen mesajdan kripto para, blockchain teknolojisi veya finans ile ilgili en önemli anahtar kelimeyi çıkar. Sadece tek bir kelime olarak cevap ver. Örneğin: 'Bitcoin nedir?' -> 'bitcoin', 'Ethereum hakkında bilgi ver' -> 'ethereum', 'DeFi protokolleri nasıl çalışır?' -> 'defi'"
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
<<<<<<< HEAD
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
              // Her haber için özet oluştur
              for (const news of newsData) {
                try {
                  const summary = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: `You are a content producer of the crypto world. You comment on the news very briefly in 1 to 2 sentences.
Now I am presenting you a news story, please comment on it very briefly in 1 to 2 sentences, write it in bullet points and use the numerical data in the news as much as possible. If there are things in the news that you think can be an opportunity for people, be sure to mention them.
Comment on the main event in the news in the first one or two sentences.
Comments should not exceed 4 sentences. Don't bore the reader, keep it short. Here is the news content (comment in English, make sure it is short and the output should never exceed 3 sentences. list the items in the news): {content}

Now comment on this news in maximum 3 sentences, paying attention to the criteria I told you.

Examples:
1. World Liberty, the crypto project supported by the Donald Trump family, took advantage of the fall in Ethereum and invested another 2.5 million dollars.
While you're still waiting for "I'll buy it when it drops a bit more", big players are sweeping up opportunities.

2. There's a fashionable "doomsday" vibe in the Bitcoin community. It's a bit ironic, isn't it? Everyone's screaming "Lambo" and panicking at the slightest drop. But look, maybe all this fear, uncertainty and doubt is a signal that Bitcoin will break through the $100,000 resistance level. Psst... a hint: The market often reverses when you least expect it.

comment on the news with humor as long as these examples last

Focus more on content related to: ${keyword}`
                      },
                      {
                        role: "user",
                        content: `${news.title}\n\n${news.content}`
                      }
                    ],
                    model: "gpt-3.5-turbo",
                  });

                  // Her haberi tek tek ekle
                  setMessages(prev => [...prev, {
                    type: 'bot',
                    content: `📰 ${news.title}\n\n${summary.choices[0]?.message?.content || news.content}\n\n🔗 <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
                  }]);

                } catch (error) {
                  console.error('Haber özetleme hatası:', error);
                  // Hata durumunda orijinal haberi göster
                  setMessages(prev => [...prev, {
                    type: 'bot',
                    content: `📰 ${news.title}\n\n${news.content}`
                  }]);
                }
              }
            } else {
              setMessages(prev => [...prev, {
                type: 'bot',
                content: 'Sorry, I could not find any recent news on this topic.'
              }]);
            }
          } catch (error) {
            console.error('Haber çekme hatası:', error);
            setMessages(prev => [...prev, {
              type: 'bot',
              content: 'Sorry, an error occurred while fetching the news. Please try again.'
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
=======
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
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
            type: 'bot',
            content: botResponse + "\n\n⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir."
          }]);
        }
      } else {
<<<<<<< HEAD
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
        
=======
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
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
<<<<<<< HEAD
            <h1 className="text-xl font-bold text-white">Journalist MOAI</h1>
            <p className="text-sm text-blue-300/80">Crypto & Blockchain Assistant</p>
=======
            <h1 className="text-xl font-bold text-white">Gazeteci MOAI</h1>
            <p className="text-sm text-blue-300/80">Kripto & Blockchain Asistanı</p>
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
          </div>
        </div>
      </header>

      {/* Chat Container */}
<<<<<<< HEAD
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-blue-600/50 hover:[&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full">
=======
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar">
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
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
<<<<<<< HEAD
              dangerouslySetInnerHTML={{ __html: message.content }}
            >
=======
            >
              {message.content}
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
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
<<<<<<< HEAD
            {isLoading ? 'Responding...' : 'Send'}
=======
            {isLoading ? 'Yanıtlıyor...' : 'Gönder'}
>>>>>>> 387383c903d340cbd320d5ed5379e802142ba4c5
          </button>
        </form>
      </div>
    </div>
  );
} 