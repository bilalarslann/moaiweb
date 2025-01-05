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
      content: `Hello! I'm JOURNALIST MOAI 🗿\n\nI'm ready to answer your questions about cryptocurrencies, blockchain technology, or any other topic.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>('en');

  const placeholders = {
    en: [
      "What is Bitcoin?",
      "Tell me about Ethereum",
      "How does blockchain work?",
      "What are NFTs?",
      "What is DeFi?",
    ],
    tr: [
      "Bitcoin nedir?",
      "Ethereum hakkında bilgi ver",
      "Blockchain nasıl çalışır?",
      "NFT'ler nedir?",
      "DeFi nedir?",
    ]
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [userLanguage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // First, detect the language of the user's message
      const languageDetection = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a language detector. Analyze the given text and return ONLY "tr" for Turkish or "en" for English in your response. Nothing else.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const detectedLanguage = languageDetection.choices[0]?.message?.content?.trim().toLowerCase() as 'en' | 'tr';
      setUserLanguage(detectedLanguage);

      // Analyze message for keywords
      const keywordCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: detectedLanguage === 'tr' ? 
              `Verilen mesajdan kripto para, blockchain teknolojisi veya finans ile ilgili anahtar kelimeleri ve bağlamı çıkar.
              
              Önemli kurallar:
              1. "haberleri", "haber", "haberler" gibi son ekleri arama teriminden çıkar
              2. Eğer mesajda birden fazla anlamlı kelime varsa (örn: "solana tvl", "bitcoin fiyat") bunları birleştir
              3. Tek bir terim varsa (örn: "tüik", "bitcoin") sadece o terimi kullan
              4. Her anahtar kelime için bir display_term (gösterilecek) ve search_term (arama için kullanılacak İngilizce karşılığı) belirle
              
              Örnekler:
              - "tüik haberleri" -> {
                  "display_terms": ["TÜİK"],
                  "search_terms": ["TUIK", "Turkish Statistical Institute", "Turkey Statistics"],
                  "context": "general"
                }
              - "türkiye haberleri" -> {
                  "display_terms": ["TÜRKİYE"],
                  "search_terms": ["Turkey", "Turkish"],
                  "context": "general"
                }
              - "bitcoin fiyat haberleri" -> {
                  "display_terms": ["BİTCOİN FİYAT"],
                  "search_terms": ["Bitcoin price", "BTC price", "Bitcoin"],
                  "context": "price"
                }
              
              Cevabı JSON formatında ver. 
              
              Format: { 
                "display_terms": ["gösterilecek_terim"],
                "search_terms": ["arama_terimi1", "arama_terimi2"],
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
              - "tvl": TVL haberleri
              - "mining": Madencilik haberleri
              - "staking": Staking haberleri` :
              `Extract keywords and context related to cryptocurrency, blockchain technology, or finance from the given message.
              
              Important rules:
              1. Remove suffixes like "news", "updates" from the search term
              2. If message has multiple meaningful words (e.g., "solana tvl", "bitcoin price") combine them
              3. If there's only one term (e.g., "tuik", "bitcoin") use just that term
              4. For each keyword, determine a display_term (to show) and search_term (English equivalent for searching)
              
              Examples:
              - "tuik news" -> {
                  "display_terms": ["TUIK"],
                  "search_terms": ["TUIK", "Turkish Statistical Institute", "Turkey Statistics"],
                  "context": "general"
                }
              - "turkey news" -> {
                  "display_terms": ["TURKEY"],
                  "search_terms": ["Turkey", "Turkish"],
                  "context": "general"
                }
              - "bitcoin price news" -> {
                  "display_terms": ["BITCOIN PRICE"],
                  "search_terms": ["Bitcoin price", "BTC price", "Bitcoin"],
                  "context": "price"
                }
              
              Return the answer in JSON format.
              
              Format: {
                "display_terms": ["display_term"],
                "search_terms": ["search_term1", "search_term2"],
                "isNewsRequest": true/false,
                "context": "news_type"
              }

              news_type values:
              - "general": General news
              - "price": Price news
              - "update": Update/development news
              - "partnership": Partnership news
              - "regulation": Regulation news
              - "security": Security news
              - "adoption": Adoption/usage news
              - "tvl": TVL news
              - "mining": Mining news
              - "staking": Staking news`
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

      if (response.display_terms?.length > 0) {
        if (isNewsRequest) {
          // Show language-specific news announcement with display term
          setMessages(prev => [...prev, {
            type: 'bot',
            content: detectedLanguage === 'tr' ? 
              `🗞️ ${response.display_terms[0]} ile ilgili son gelişmeleri aktarıyorum...` :
              `🗞️ Bringing you the latest news about ${response.display_terms[0]}...`
          }]);

          try {
            // İlk olarak en spesifik anahtar kelime ile ara
            const mainResponse = await fetch('/api/scrape', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                searchQuery: response.search_terms[0], // Use English search term
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
              for (const searchTerm of response.search_terms.slice(1)) { // Use remaining English search terms
                const response = await fetch('/api/scrape', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    searchQuery: searchTerm,
                    context: context
                  }),
                });

                const newsData = await response.json();
                if (Array.isArray(newsData)) {
                  allNews.push(...newsData);
                }
              }
            }

            // Haberleri tarihe göre sırala ve tekrarları kaldır
            const uniqueNews = Array.from(new Map(allNews.map(news => [news.title, news])).values())
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5); // En güncel 5 haber

            if (uniqueNews.length > 0) {
              // For each news item, translate if needed based on user language
              for (const news of uniqueNews) {
                try {
                  const translation = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: detectedLanguage === 'tr' ? 
                          `Sen profesyonel bir çevirmen ve kripto haber editörüsün. Haberleri Türkçe'ye çevir ve özetle. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak.

JSON formatında dön:
{
  "title": "çevrilmiş başlık",
  "content": "çevrilmiş içerik",
  "isTranslated": true/false
}` :
                          `You are a professional translator and crypto news editor. Translate the news to English if needed and summarize. Keep technical terms and cryptocurrency names unchanged.

Return in JSON format:
{
  "title": "translated title",
  "content": "translated content",
  "isTranslated": true/false
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
                  
                  const finalTitle = translatedText.isTranslated ? translatedText.title : news.title;
                  const finalContent = translatedText.isTranslated ? translatedText.content : news.content;

                  // Create summary in user's language
                  const summary = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: detectedLanguage === 'tr' ?
                          `Sen kripto dünyasının içerik üreticisisin. Haberleri çok kısa şekilde yorumluyorsun.
                          Şimdi sana bir haber sunuyorum, lütfen çok kısa şekilde 1-2 cümlede yorumla, madde işaretleriyle yaz ve haberdeki sayısal verileri mümkün olduğunca kullan. Haberde insanlar için fırsat olabileceğini düşündüğün şeyler varsa mutlaka belirt.
                          Haberdeki ana olayı ilk bir veya iki cümlede yorumla.
                          Yorumlar 4 cümleyi geçmemeli. Okuyucuyu sıkma, kısa tut.

                          Bağlam türü: ${context}
                          Odaklanılacak anahtar kelimeler: ${keywords.join(', ')}` :
                          `You are a content producer of the crypto world. You comment on the news very briefly.
                          Now I am presenting you a news story, please comment on it very briefly in 1-2 sentences, write it in bullet points and use the numerical data in the news as much as possible. If there are things in the news that you think can be an opportunity for people, be sure to mention them.
                          Comment on the main event in the news in the first one or two sentences.
                          Comments should not exceed 4 sentences. Don't bore the reader, keep it short.

                          Context type: ${context}
                          Keywords to focus: ${keywords.join(', ')}`
                      },
                      {
                        role: "user",
                        content: `${finalTitle}\n\n${finalContent}`
                      }
                    ],
                    model: "gpt-3.5-turbo",
                  });

                  const translationIndicator = translatedText.isTranslated ? '🔄 ' : '';
                  
                  setMessages(prev => [...prev, {
                    type: 'bot',
                    content: `${translationIndicator}📰 ${finalTitle}\n\n${summary.choices[0]?.message?.content || finalContent}\n\n🔗 <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
                  }]);

                } catch (error) {
                  console.error('News processing error:', error);
                  setMessages(prev => [...prev, {
                    type: 'bot',
                    content: detectedLanguage === 'tr' ?
                      'Üzgünüm, haberi işlerken bir hata oluştu.' :
                      'Sorry, an error occurred while processing the news.'
                  }]);
                }
              }
            } else {
              setMessages(prev => [...prev, {
                type: 'bot',
                content: detectedLanguage === 'tr' ?
                  'Üzgünüm, bu konu hakkında güncel haber bulamadım.' :
                  'Sorry, I could not find any recent news on this topic.'
              }]);
            }
          } catch (error) {
            console.error('Error fetching news:', error);
            setMessages(prev => [...prev, {
              type: 'bot',
              content: detectedLanguage === 'tr' ?
                'Üzgünüm, haberleri getirirken bir hata oluştu. Lütfen tekrar deneyin.' :
                'Sorry, an error occurred while fetching the news. Please try again.'
            }]);
          }
        } else {
          // Regular OpenAI response for non-news queries
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: detectedLanguage === 'tr' ?
                  "Sen GAZETECİ MOAI adında bir kripto para ve blockchain uzmanı yapay zeka asistanısın. Sorulara detaylı ve anlaşılır cevaplar vermelisin. Her zaman nazik ve yardımsever olmalısın. Cevaplarının sonuna 'Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.' notunu eklemelisin." :
                  "You are JOURNALIST MOAI, an AI assistant specializing in cryptocurrency and blockchain. You should provide detailed and clear answers. Always be polite and helpful. Add the note 'This information is for educational purposes only, not investment advice.' at the end of your responses."
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            model: "gpt-3.5-turbo",
          });

          const botResponse = completion.choices[0]?.message?.content || 
            (detectedLanguage === 'tr' ? "Üzgünüm, bir hata oluştu." : "Sorry, an error occurred.");

          setMessages(prev => [...prev, {
            type: 'bot',
            content: botResponse + "\n\n⚠️ " + 
              (detectedLanguage === 'tr' ?
                "Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir." :
                "This information is for educational purposes only, not investment advice.")
          }]);
        }
      } else {
        // Regular OpenAI response when no keywords found
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: detectedLanguage === 'tr' ?
                "Sen GAZETECİ MOAI adında bir kripto para ve blockchain uzmanı yapay zeka asistanısın. Sorulara detaylı ve anlaşılır cevaplar vermelisin. Her zaman nazik ve yardımsever olmalısın. Cevaplarının sonuna 'Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.' notunu eklemelisin." :
                "You are JOURNALIST MOAI, an AI assistant specializing in cryptocurrency and blockchain. You should provide detailed and clear answers. Always be polite and helpful. Add the note 'This information is for educational purposes only, not investment advice.' at the end of your responses."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          model: "gpt-3.5-turbo",
        });

        const botResponse = completion.choices[0]?.message?.content || 
          (detectedLanguage === 'tr' ? "Üzgünüm, bir hata oluştu." : "Sorry, an error occurred.");
        
        setMessages(prev => [...prev, {
          type: 'bot',
          content: botResponse + "\n\n⚠️ " + 
            (detectedLanguage === 'tr' ?
              "Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir." :
              "This information is for educational purposes only, not investment advice.")
        }]);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: userLanguage === 'tr' ?
          'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' :
          'Sorry, an error occurred. Please try again.'
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