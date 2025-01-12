'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Add TradingView and Phantom types
declare global {
  interface Window {
    phantom?: any;
    solana?: any;
  }
}

const MOAI_TOKEN_ADDRESS = '2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M';
const SOLANA_RPC_URL = 'https://solana-mainnet.rpc.extrnode.com/a6f9fc24-29e2-43fb-8f5c-de216933db71';

const handleDisconnect = async (disconnect: () => Promise<void>) => {
  try {
    await disconnect();
    // Clear Phantom's cached connection
    if (typeof window !== 'undefined') {
      // Disconnect Phantom specifically
      if (window.phantom?.solana) {
        try {
          await window.phantom.solana.disconnect();
        } catch (e) {
          console.error('Error disconnecting Phantom:', e);
        }
      }
      // Also try legacy method
      if (window.solana) {
        try {
          await window.solana.disconnect();
        } catch (e) {
          console.error('Error disconnecting legacy:', e);
        }
      }
      
      // Clear all wallet related data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear specific Phantom items
      const phantomKeys = [
        'walletName',
        'connectedAccount',
        'selectedAccount',
        'phantom-recent-account',
        'phantom.selectedAccount',
        'phantom.lastAccount',
        'phantom.wallet.autoConnect',
        'phantom-is-unlocked',
        'phantom-encrypted-private-key',
        'phantom-public-key',
        'phantom-account-state',
        'phantom-connection-strategy',
        'phantom.selectedWallet',
        'phantom.lastSelectedAccount',
        'phantom.autoConnect',
        'phantom.recentWallet',
        'phantom.recentAccount',
        'phantom.wallet.lastUsed',
        'phantom.wallet.lastSelected',
        'phantom.wallet.accounts',
        'phantom.wallet.preferences'
      ];
      
      phantomKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }
    // Force a page reload after disconnect
    window.location.reload();
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
};

type Message = {
  type: 'user' | 'bot';
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface NewsArticle {
  title: string;
  snippet: string;
  link: string;
  date: string;
  source: string;
  thumbnail?: string;
}

interface ScoredArticle extends NewsArticle {
  content: string;
  description: string;
  sourceUrl: string;
  sourceText: string;
  relevanceScore: number;
  imageUrl?: string;
}

export default function JournalistMoai() {
  const hasCheckedBalance = useRef(false);
  const { publicKey, connected, disconnect } = useWallet();
  const [hasToken, setHasToken] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Hello! I'm JOURNALIST MOAI 🗿\n\nI can help you find and analyze the latest news in the crypto world. Just ask me about any crypto topic!`
    }
  ]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>('en');
  const [lastSearchTerm, setLastSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastNewsData, setLastNewsData] = useState<ScoredArticle[]>([]);
  const [lastNewsIndex, setLastNewsIndex] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);

  // Watch for new messages and update lastMessageTime
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setLastMessageTime(Date.now());
    }
  }, [messages, isLoading]);

  // Show suggestions 3 seconds after the last message
  useEffect(() => {
    if (lastMessageTime > 0 && !isLoading) {
      const timer = setTimeout(async () => {
        // If we have a lastSearchTerm, generate related suggestions
        if (lastSearchTerm) {
          try {
            const suggestionsCompletion = await openai.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: userLanguage === 'tr' ? 
                    `Verilen terimle ilgili 3 farklı haber araması öner ve JSON formatında dön.
                    
                    Önemli kurallar:
                    1. İlk öneri her zaman "Daha fazla [terim] haberi" olsun
                    2. Diğer öneriler aynı konuyla ilgili farklı açılardan haberler olsun
                    3. Çok kısa ve net olsun (2-4 kelime)
                    4. Sadece haber araması olacak şekilde yaz
                    
                    Örnek - "bitcoin" için:
                    {
                      "suggestions": [
                        "Daha fazla bitcoin haberi",
                        "Bitcoin regülasyon haberleri",
                        "Bitcoin ETF haberleri"
                      ]
                    }
                    
                    Örnek - "yapay zeka" için:
                    {
                      "suggestions": [
                        "Daha fazla yapay zeka haberi",
                        "Yapay zeka güvenlik haberleri",
                        "Yapay zeka şirket haberleri"
                      ]
                    }
                    
                    Cevabı JSON formatında dön.` :
                    `Suggest 3 different news searches related to the given term and return in JSON format.
                    
                    Important rules:
                    1. First suggestion should always be "More [term] news"
                    2. Other suggestions should be different aspects of the same topic
                    3. Keep it very short and clear (2-4 words)
                    4. Write only as news searches
                    
                    Example - for "bitcoin":
                    {
                      "suggestions": [
                        "More bitcoin news",
                        "Bitcoin regulation news",
                        "Bitcoin ETF news"
                      ]
                    }
                    
                    Example - for "AI":
                    {
                      "suggestions": [
                        "More AI news",
                        "AI security news",
                        "AI company news"
                      ]
                    }
                    
                    Return response in JSON format.`,
                },
                {
                  role: "user",
                  content: lastSearchTerm
                }
              ],
              model: "gpt-",
              response_format: { type: "json_object" }
            });

            const response = JSON.parse(suggestionsCompletion.choices[0]?.message?.content || "{}");
            if (response.suggestions && Array.isArray(response.suggestions)) {
              setSuggestions(response.suggestions);
              setTimeout(() => {
                setShowSuggestions(true);
              }, 100);
            }
          } catch (error) {
            console.error('Error generating suggestions:', error);
            // Fallback suggestions if error occurs
            const fallbackSuggestions = userLanguage === 'tr' ? [
              `Daha fazla ${lastSearchTerm} haberi`,
              `${lastSearchTerm} güncel haberler`,
              `${lastSearchTerm} son gelişmeler`
            ] : [
              `More ${lastSearchTerm} news`,
              `${lastSearchTerm} latest news`,
              `${lastSearchTerm} recent updates`
            ];
            setSuggestions(fallbackSuggestions);
            setTimeout(() => {
              setShowSuggestions(true);
            }, 100);
          }
        } else {
          // Initial suggestions (news topics)
          const newSuggestions = userLanguage === 'tr' ? [
            'Kripto para haberleri',
            'Yapay zeka haberleri',
            'Blockchain haberleri'
          ] : [
            'The latest on Ethereum updates',
            'AI agents news',
            'Blockchain news'
          ];
          setSuggestions(newSuggestions);
          setTimeout(() => {
            setShowSuggestions(true);
          }, 100);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [lastMessageTime, isLoading, lastSearchTerm, userLanguage]);

  // When component mounts, show initial suggestions
  useEffect(() => {
    const initialSuggestions = userLanguage === 'tr' ? [
      'AI Ajanlar hakkında haberler',
      'Ethereum güncel gelişmeleri',
      'Bitcoin ve kripto regülasyonları'
    ] : [
      'AI Agents news',
      'Latest Ethereum developments',
      'Bitcoin and crypto regulations'
    ];
    setSuggestions(initialSuggestions);
    setTimeout(() => {
      setShowSuggestions(true);
    }, 100);
  }, []);

  // Update suggestions when lastSearchTerm changes
  useEffect(() => {
    if (lastSearchTerm) {
      // Reset suggestions first
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [lastSearchTerm]);

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.startsWith('Daha fazla') || suggestion.startsWith('More')) {
      // Directly show more news without sending a new message
      showMoreNews();
    } else {
      // Directly send the suggestion as a message
      setIsLoading(true);
      handleSubmit(new Event('submit') as any, suggestion);
    }
  };

  const showMoreNews = async () => {
    if (lastNewsData.length === 0 || lastNewsIndex >= lastNewsData.length) {
      setMessages(prev => [...prev, {
        type: 'bot',
        content: userLanguage === 'tr' ?
          'Bu konuda gösterebileceğim başka haber kalmadı.' :
          'There are no more news articles to show on this topic.'
      }]);
      return;
    }

    setIsLoading(true);
    const nextBatch = lastNewsData.slice(lastNewsIndex, lastNewsIndex + 5);
    setLastNewsIndex(prev => prev + 5);

    // Process and display more news
    for (const news of nextBatch) {
      try {
        const translation = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: userLanguage === 'tr' ? 
                `Sen profesyonel bir çevirmen ve kripto haber editörüsün. İngilizce haberleri Türkçe'ye çevir ve özetle. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak.

JSON formatında dön:
{
  "title": "çevrilmiş başlık",
  "content": "çevrilmiş içerik",
  "isTranslated": true
}` :
                `You are a professional translator and crypto news editor. Keep the news in English but summarize if needed. Keep technical terms and cryptocurrency names unchanged.

Return in JSON format:
{
  "title": "title",
  "content": "content",
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
        
        const finalTitle = translatedText.isTranslated ? translatedText.title : news.title;
        const finalContent = translatedText.isTranslated ? translatedText.content : news.content;

        const summary = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: userLanguage === 'tr' ?
                `Sen hızlı ve net özetler yapan bir haber editörüsün.
                
                Kurallar:
                1. Haberi 2 kısa paragrafta özetle
                2. İlk paragrafta ana konuyu anlat
                3. İkinci paragrafta önemli detayları ver
                4. Kısa ve öz cümleler kullan
                5. Sadece en önemli bilgilere odaklan` :
                `You are a news editor who makes quick and clear summaries.
                
                Rules:
                1. Summarize the news in 2 short paragraphs
                2. First paragraph for the main topic
                3. Second paragraph for important details
                4. Use short and concise sentences
                5. Focus only on the most important information`
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
          content: `${translationIndicator}${finalTitle}\n\n${summary.choices[0]?.message?.content || finalContent}\n\nKaynak: <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
        }]);
      } catch (error) {
        console.error('News processing error:', error);
      }
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent, directMessage?: string) => {
    e.preventDefault();
    if ((!input.trim() && !directMessage) || isLoading) return;

    const userMessage = directMessage || input;
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // Check if user is asking for more news
      const moreNewsRegexTR = /(birkaç|daha fazla|başka|diğer).*(haber|göster)/i;
      const moreNewsRegexEN = /(more|other|additional).*(news|show)/i;

      if ((moreNewsRegexTR.test(userMessage) || moreNewsRegexEN.test(userMessage))) {
        // Instead of showing more news, we'll just treat it as a new search
        // The suggestions will guide users to make specific queries
        setMessages(prev => [...prev, {
          type: 'bot',
          content: userLanguage === 'tr' ?
            'Lütfen yukarıdaki önerilerden birini seçin veya yeni bir arama yapın.' :
            'Please select one of the suggestions above or make a new search.'
        }]);
        setIsLoading(false);
        return;
      }

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
              `Verilen mesajdan arama terimlerini çıkar.
              
              Önemli kurallar:
              1. Sadece "haberleri", "haber", "haberler" gibi son ekleri çıkar
              2. Özel terimleri ve birleşik kelimeleri koru:
                 - "ethereum 2.0" -> "ethereum 2.0"
                 - "ethereum the merge" -> "ethereum the merge"
                 - "bitcoin halving" -> "bitcoin halving"
              3. Kripto para isimleri ve teknoloji terimlerini doğru şekilde birleştir
              4. Türkçe karakterleri İngilizce karşılıklarıyla değiştir
              5. Her mesajı haber isteği olarak değerlendir
              6. Arama konusunu daraltacak ek terimleri koru:
                 - "AI Agents updates" -> "AI Agents updates"
                 - "Ethereum security" -> "Ethereum security"
                 - "Bitcoin mining news" -> "Bitcoin mining"
              
              Örnek:
              - "bitcoin haberleri" -> "bitcoin"
              - "ethereum the merge haberleri" -> "ethereum the merge"
              - "ethereum 2.0 güncellemesi haberleri" -> "ethereum 2.0 updates"
              - "bitcoin halving ne zaman" -> "bitcoin halving"
              - "AI Ajanlar hakkında" -> "AI Agents"
              - "AI Agents recent updates" -> "AI Agents updates"
              - "Ethereum security news" -> "Ethereum security"
              
              Cevabı JSON formatında ver:
              {
                "display_terms": ["gösterilecek_terim"],
                "search_terms": ["arama_terimi"],
                "isNewsRequest": true
              }` :
              `Extract search terms from the given message.
              
              Important rules:
              1. Only remove suffixes like "news", "updates" if they are standalone
              2. Preserve special terms and compound words:
                 - "ethereum 2.0" -> "ethereum 2.0"
                 - "ethereum the merge" -> "ethereum the merge"
                 - "bitcoin halving" -> "bitcoin halving"
              3. Correctly combine cryptocurrency names and technology terms
              4. Keep English characters
              5. Treat every message as a news request
              6. Keep additional terms that narrow down the search:
                 - "AI Agents updates" -> "AI Agents updates"
                 - "Ethereum security" -> "Ethereum security"
                 - "Bitcoin mining news" -> "Bitcoin mining"
              
              Example:
              - "bitcoin news" -> "bitcoin"
              - "ethereum the merge news" -> "ethereum the merge"
              - "ethereum 2.0 update news" -> "ethereum 2.0 updates"
              - "when is bitcoin halving" -> "bitcoin halving"
              - "About AI Agents" -> "AI Agents"
              - "AI Agents recent updates" -> "AI Agents updates"
              - "Ethereum security news" -> "Ethereum security"
              
              Return in JSON format:
              {
                "display_terms": ["display_term"],
                "search_terms": ["search_term"],
                "isNewsRequest": true
              }`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(keywordCompletion.choices[0]?.message?.content || "{}");

      if (response.display_terms?.length > 0) {
        if (response.isNewsRequest) {
          try {
            // Google News RSS feed'den haberleri çek
            const mainResponse = await fetch(`/api/news?q=${encodeURIComponent(response.search_terms[0])}`);
            const mainNewsData = await mainResponse.json();
            
            // Store the search term for suggestions
            setLastSearchTerm(response.search_terms[0]);

            // Show language-specific news announcement with display term
            setMessages(prev => [...prev, {
              type: 'bot',
              content: detectedLanguage === 'tr' ? 
                `🗞️ ${response.display_terms[0].toUpperCase()} hakkında ${mainNewsData.news_results?.length || 0} haber buldum...` :
                `🗞️ Found ${mainNewsData.news_results?.length || 0} news about ${response.display_terms[0].toUpperCase()}...`
            }]);

            let allNews = [];
            if (mainNewsData.news_results && mainNewsData.news_results.length > 0) {
              // Alakalılık skorunu hesapla ve haberleri filtrele
              const searchTerms = response.search_terms[0].toLowerCase().split(' ');
              const scoredNews = mainNewsData.news_results
                .map((article: any) => {
                  const combinedText = `${article.title} ${article.snippet}`.toLowerCase();
                  
                  // Alakalılık skoru hesapla
                  let relevanceScore = 0;
                  let matchedTerms = 0;

                  // Tüm terimlerin eşleşmesini kontrol et
                  searchTerms.forEach((term: string) => {
                    if (combinedText.includes(term.toLowerCase())) {
                      matchedTerms++;
                      relevanceScore += 1;
                    }
                  });

                  // Tüm terimler varsa bonus puan
                  if (matchedTerms === searchTerms.length) {
                    relevanceScore += 2;
                  }

                  // Tam eşleşme varsa ekstra bonus
                  if (combinedText.includes(response.search_terms[0].toLowerCase())) {
                    relevanceScore += 3;
                  }

                  // Kripto haber sitelerinden gelenlere ek puan
                  const cryptoSites = ['cointelegraph.com', 'coindesk.com', 'decrypt.co', 'theblockcrypto.com', 'cryptonews.com'];
                  if (article.link) {
                    cryptoSites.forEach(site => {
                      if (article.link.includes(site)) {
                        relevanceScore += 0.5;
                      }
                    });
                  }

                  return {
                    title: article.title,
                    content: article.snippet,
                    description: article.snippet,
                    date: article.date,
                    sourceUrl: article.link,
                    sourceText: article.source,
                    relevanceScore,
                    imageUrl: article.thumbnail
                  };
                })
                .filter((article: ScoredArticle) => article.relevanceScore > searchTerms.length) // En az tüm terimler eşleşmeli
                .sort((a: ScoredArticle, b: ScoredArticle) => b.relevanceScore - a.relevanceScore);

              // Store all scored news for later use
              setLastNewsData(scoredNews);
              setLastNewsIndex(5);

              // Display first 5 news
              const firstBatch = scoredNews.slice(0, 5);
              
              // Process and display each news
              for (const news of firstBatch) {
                try {
                  const translation = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: userLanguage === 'tr' ? 
                          `Sen profesyonel bir çevirmen ve kripto haber editörüsün. İngilizce haberleri Türkçe'ye çevir ve özetle. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak.

JSON formatında dön:
{
  "title": "çevrilmiş başlık",
  "content": "çevrilmiş içerik",
  "isTranslated": true
}` :
                          `You are a professional translator and crypto news editor. Keep the news in English but summarize if needed. Keep technical terms and cryptocurrency names unchanged.

Return in JSON format:
{
  "title": "title",
  "content": "content",
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
                  
                  const finalTitle = translatedText.isTranslated ? translatedText.title : news.title;
                  const finalContent = translatedText.isTranslated ? translatedText.content : news.content;

                  const summary = await openai.chat.completions.create({
                    messages: [
                      {
                        role: "system",
                        content: userLanguage === 'tr' ?
                          `Sen hızlı ve net özetler yapan bir haber editörüsün.
                          
                          Kurallar:
                          1. Haberi 2 kısa paragrafta özetle
                          2. İlk paragrafta ana konuyu anlat
                          3. İkinci paragrafta önemli detayları ver
                          4. Kısa ve öz cümleler kullan
                          5. Sadece en önemli bilgilere odaklan` :
                          `You are a news editor who makes quick and clear summaries.
                          
                          Rules:
                          1. Summarize the news in 2 short paragraphs
                          2. First paragraph for the main topic
                          3. Second paragraph for important details
                          4. Use short and concise sentences
                          5. Focus only on the most important information`
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
                    content: `${translationIndicator}${finalTitle}\n\n${summary.choices[0]?.message?.content || finalContent}\n\nKaynak: <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
                  }]);
                } catch (error) {
                  console.error('News processing error:', error);
                }
              }
              setIsLoading(false);
            } else {
              setMessages(prev => [...prev, {
                type: 'bot',
                content: detectedLanguage === 'tr' ?
                  'Üzgünüm, bu konu hakkında güncel haber bulamadım.' :
                  'Sorry, I could not find any recent news on this topic.'
              }]);
              setIsLoading(false);
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add wallet check effect
  useEffect(() => {
    const checkTokenBalance = async () => {
      // Skip if we've already checked and the wallet is still connected
      if (hasCheckedBalance.current && connected) {
        return;
      }

      if (!connected || !publicKey) {
        setHasToken(false);
        setIsWalletLoading(false);
        hasCheckedBalance.current = false;
        return;
      }

      try {
        const connection = new Connection(SOLANA_RPC_URL);
        
        // Get all token accounts owned by the user
        const response = await fetch(SOLANA_RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [
              publicKey.toString(),
              {
                programId: TOKEN_PROGRAM_ID.toString()
              },
              {
                encoding: 'jsonParsed',
                commitment: 'confirmed'
              }
            ]
          })
        });

        const data = await response.json();
        
        if (data.error) {
          console.error('RPC error:', data.error);
          setHasToken(false);
          setIsWalletLoading(false);
          return;
        }

        // Find MOAI token account
        const moaiAccount = data.result?.value?.find((account: any) => 
          account.account.data.parsed.info.mint === MOAI_TOKEN_ADDRESS
        );

        if (!moaiAccount) {
          setHasToken(false);
          setIsWalletLoading(false);
          return;
        }

        // Get the token amount
        const tokenAmount = moaiAccount.account.data.parsed.info.tokenAmount;
        if (tokenAmount && 
            typeof tokenAmount.amount === 'string' && 
            typeof tokenAmount.decimals === 'number') {
          const amount = Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals);
          setHasToken(amount >= 200000);
        } else {
          setHasToken(false);
        }
        
        // Mark that we've checked the balance
        hasCheckedBalance.current = true;
      } catch (error) {
        console.error('Error checking token balance:', error);
        setHasToken(false);
      }
      setIsWalletLoading(false);
    };

    checkTokenBalance();
  }, [connected, publicKey]);

  // Render loading state
  if (isWalletLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-blue-300 mt-4">Checking wallet...</p>
      </div>
    );
  }

  // Render connect wallet state
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white mb-8">Welcome to Journalist MOAI</h1>
          <p className="text-blue-300 mb-8">Please connect your wallet to access the news</p>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 transition-colors" />
        </div>
      </div>
    );
  }

  // Render insufficient token state
  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white mb-4">Access Required</h1>
          <p className="text-blue-300 mb-2">You need to hold at least 200,000 MOAI tokens to access this feature</p>
          <p className="text-blue-400/80 text-sm mb-8">Current holdings are insufficient</p>
          <div className="flex flex-col gap-3">
            <a 
              href="https://raydium.io/swap/?inputCurrency=sol&outputCurrency=2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M&fixed=in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Get MOAI Tokens
            </a>
            <button
              onClick={() => handleDisconnect(disconnect)}
              className="bg-red-600/20 text-red-300 px-6 py-3 rounded-xl hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-blue-600/50 hover:[&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
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

      {/* Suggestions Area */}
      <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-4xl bottom-24">
        {suggestions.length > 0 && !isLoading && (
          <div className={`flex justify-center gap-3 flex-wrap transition-opacity duration-1000 ${showSuggestions ? 'opacity-100' : 'opacity-0'}`}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 rounded-lg transition-all duration-200 
                  border border-blue-500/50 text-blue-400 hover:text-blue-300
                  shadow-[0_0_10px_0] shadow-blue-500/20 bg-black/80 backdrop-blur-md
                  hover:shadow-[0_0_15px_0] hover:shadow-blue-500/30 hover:border-blue-400/50 text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-900/30 bg-black/30 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={userLanguage === 'tr' ? 'Bir haber konusu yazın...' : 'Type a news topic...'}
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
    </div>
  );
} 