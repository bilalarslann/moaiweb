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

    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // Mesajı analiz et ve anahtar kelimeleri bul
      const keywordCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Verilen mesajdan kripto para, blockchain teknolojisi veya finans ile ilgili anahtar kelimeleri ve bağlamı çıkar. 
            Cevabı JSON formatında ver. 
            
            Format: { 
              "keywords": ["ana_terim", "ilgili_terim1", "ilgili_terim2"], 
              "isNewsRequest": true/false,
              "context": "news_type"
            }

            news_type değerleri:
            - "general": Genel haberler
            - "price": Fiyat haberleri
            - "update": Güncelleme/geliştirme haberleri
            - "partnership": Ortaklık haberleri
            - "regulation": Regülasyon haberleri
            - "security": Güvenlik haberleri
            - "adoption": Adaptasyon/kullanım haberleri
            
            Örnekler:
            "Bitcoin haberleri neler?" -> 
            { 
              "keywords": ["bitcoin"], 
              "isNewsRequest": true,
              "context": "general"
            }

            "Ethereum güncellemeleri hakkında son haberleri ver" -> 
            { 
              "keywords": ["ethereum", "ethereum update", "ethereum upgrade", "ethereum development"], 
              "isNewsRequest": true,
              "context": "update"
            }

            "Ripple davasıyla ilgili son gelişmeler neler?" -> 
            { 
              "keywords": ["ripple", "ripple lawsuit", "ripple sec", "xrp lawsuit"], 
              "isNewsRequest": true,
              "context": "regulation"
            }

            "Bitcoin fiyatı neden düştü?" -> 
            { 
              "keywords": ["bitcoin", "bitcoin price", "bitcoin crash", "bitcoin market"], 
              "isNewsRequest": true,
              "context": "price"
            }

            "Ethereum nedir?" -> 
            { 
              "keywords": ["ethereum"], 
              "isNewsRequest": false,
              "context": "general"
            }`
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
      const keywords = response.keywords || [];
      const isNewsRequest = response.isNewsRequest;
      const context = response.context;

      if (keywords.length > 0) {
        if (isNewsRequest) {
          // Get the most specific keyword based on context
          const getMainKeyword = (keywords: string[], context: string) => {
            // Find the most specific keyword for the given context
            const contextKeywords = keywords.filter(k => {
              switch (context) {
                case 'update':
                  return k.includes('update') || k.includes('upgrade') || k.includes('development');
                case 'price':
                  return k.includes('price') || k.includes('market') || k.includes('trading');
                case 'regulation':
                  return k.includes('lawsuit') || k.includes('regulation') || k.includes('sec');
                case 'security':
                  return k.includes('security') || k.includes('hack') || k.includes('vulnerability');
                case 'partnership':
                  return k.includes('partnership') || k.includes('collaboration') || k.includes('deal');
                case 'adoption':
                  return k.includes('adoption') || k.includes('integration') || k.includes('implementation');
                default:
                  return true;
              }
            });
            
            // Return the most specific keyword or fall back to the first keyword
            return contextKeywords.length > 0 ? contextKeywords[0] : keywords[0];
          };

          const mainKeyword = getMainKeyword(keywords, context);
          
          // Show English news announcement
          setMessages(prev => [...prev, {
            type: 'bot',
            content: `🗞️ Bringing you the latest news for ${mainKeyword.toUpperCase()}.`
          }]);

          try {
            // İlk olarak en spesifik anahtar kelime ile ara
            const mainResponse = await fetch('/api/scrape', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                searchQuery: mainKeyword,
                context: context
              }),
            });

            let allNews = [];
            const mainNewsData = await mainResponse.json();
            if (Array.isArray(mainNewsData)) {
              allNews.push(...mainNewsData);
            }

            // Eğer yeterli haber bulunamadıysa, diğer anahtar kelimeleri de dene
            if (allNews.length < 3) {
              for (const keyword of keywords) {
                if (keyword !== mainKeyword) {
                  const response = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      searchQuery: keyword,
                      context: context
                    }),
                  });

                  const newsData = await response.json();
                  if (Array.isArray(newsData)) {
                    allNews.push(...newsData);
                  }
                }
              }
            }

            // Haberleri tarihe göre sırala ve tekrarları kaldır
            const uniqueNews = Array.from(new Map(allNews.map(news => [news.title, news])).values())
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5); // En güncel 5 haber

            if (uniqueNews.length > 0) {
              // Her haber için özet oluştur
              for (const news of uniqueNews) {
                try {
                  // First, translate if the content is in Turkish
                  const translation = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: `You are a professional translator. Your task is to translate both the title and content from Turkish to English if they are in Turkish. If they're already in English, return them unchanged.

Return the translation in this JSON format:
{
  "title": "translated title",
  "content": "translated content",
  "isTranslated": true/false
}

Translation Rules:
1. ALWAYS translate both title and content if they contain ANY Turkish words
2. Maintain all numbers, dates, and amounts (just convert TL/Lira to USD if present)
3. Keep technical terms, cryptocurrency names, and proper nouns unchanged
4. Keep URLs and special characters unchanged
5. Make the translation sound natural and professional in English
6. Set isTranslated to true if ANY translation was needed (even if just one word was Turkish)
7. For mixed language text (some Turkish, some English), translate the Turkish parts

Examples:

Input: 
Title: "Bitcoin'in fiyatı 50.000 dolara ulaştı"
Content: "Leading cryptocurrency Bitcoin, son 24 saatte %10 artışla 50.000 dolar seviyesine ulaştı."

Output:
{
  "title": "Bitcoin's price reached $50,000",
  "content": "Leading cryptocurrency Bitcoin reached the $50,000 level with a 10% increase in the last 24 hours.",
  "isTranslated": true
}

Input:
Title: "Ethereum update haberleri: Denetim tamamlandı"
Content: "The Ethereum network's latest update has completed its audit successfully."

Output:
{
  "title": "Ethereum update news: Audit completed",
  "content": "The Ethereum network's latest update has completed its audit successfully.",
  "isTranslated": true
}

Input:
Title: "Breaking: ETH price hits new ATH"
Content: "Ethereum (ETH) has reached a new all-time high today."

Output:
{
  "title": "Breaking: ETH price hits new ATH",
  "content": "Ethereum (ETH) has reached a new all-time high today.",
  "isTranslated": false
}`
                      },
                      {
                        role: "user",
                        content: `Title: ${news.title}\nContent: ${news.content}`
                      }
                    ],
                    model: "gpt-4-turbo-preview",
                    response_format: { type: "json_object" }
                  });

                  const translatedText = JSON.parse(translation.choices[0]?.message?.content || "{}");
                  
                  // Use translated text if translation was needed, otherwise use original
                  const finalTitle = translatedText.isTranslated ? translatedText.title : news.title;
                  const finalContent = translatedText.isTranslated ? translatedText.content : news.content;

                  // Then create the summary in English
                  const summary = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: `You are a content producer of the crypto world. You comment on the news very briefly in 1 to 2 sentences.
                        Now I am presenting you a news story, please comment on it very briefly in 1 to 2 sentences, write it in bullet points and use the numerical data in the news as much as possible. If there are things in the news that you think can be an opportunity for people, be sure to mention them.
                        Comment on the main event in the news in the first one or two sentences.
                        Comments should not exceed 4 sentences. Don't bore the reader, keep it short.

                        Context type: ${context} (focus more on this aspect)
                        Keywords to focus: ${keywords.join(', ')}

                        Now comment on this news in maximum 3 sentences, paying attention to the criteria I told you.

                        Examples:
                        1. World Liberty, the crypto project supported by the Donald Trump family, took advantage of the fall in Ethereum and invested another 2.5 million dollars.
                        While you're still waiting for "I'll buy it when it drops a bit more", big players are sweeping up opportunities.

                        2. There's a fashionable "doomsday" vibe in the Bitcoin community. It's a bit ironic, isn't it? Everyone's screaming "Lambo" and panicking at the slightest drop. But look, maybe all this fear, uncertainty and doubt is a signal that Bitcoin will break through the $100,000 resistance level. Psst... a hint: The market often reverses when you least expect it.

                        comment on the news with humor as long as these examples last`
                      },
                      {
                        role: "user",
                        content: `${finalTitle}\n\n${finalContent}`
                      }
                    ],
                    model: "gpt-3.5-turbo",
                  });

                  // Add translation indicator if the news was translated
                  const translationIndicator = translatedText.isTranslated ? '🔄 ' : '';
                  
                  setMessages(prev => [...prev, {
                    type: 'bot',
                    content: `${translationIndicator}📰 ${finalTitle}\n\n${summary.choices[0]?.message?.content || finalContent}\n\n🔗 <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
                  }]);

                } catch (error) {
                  console.error('News processing error:', error);
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
            console.error('Error fetching news:', error);
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
              dangerouslySetInnerHTML={{ __html: message.content }}
            >
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