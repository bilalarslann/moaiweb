declare global {
  interface Window {
    phantom?: any;
    solana?: any;
  }
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

type Message = {
  type: 'user' | 'bot';
  content: string;
  timestamp?: number;
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

async function translateText(text: string): Promise<string> {
  const translation = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "Sen profesyonel bir çevirmensin. Verilen metni Türkçe'ye çevir. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak."
      },
      {
        role: "user",
        content: text
      }
    ],
    model: "gpt-3.5-turbo",
  });
  
  return translation.choices[0]?.message?.content || text;
}

async function translateSearchTerms(searchText: string): Promise<string> {
  const translation = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Sen bir arama terimi çevirmensin. Verilen Türkçe arama terimini İngilizce'ye çevir.
        Kripto para isimleri ve teknik terimleri olduğu gibi bırak.
        Sadece arama için en uygun İngilizce karşılığını ver.
        Örnek:
        - "ethereum pectra gelişmeleri" -> "ethereum pectra updates"
        - "bitcoin fiyat analizi" -> "bitcoin price analysis"
        - "solana son durum" -> "solana latest news"
        `
      },
      {
        role: "user",
        content: searchText
      }
    ],
    model: "gpt-4",
  });
  
  return translation.choices[0]?.message?.content || searchText;
}

export default function JournalistMoai() {
  const hasCheckedBalance = useRef(false);
  const { publicKey, connected, disconnect } = useWallet();
  const [hasToken, setHasToken] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>('en');
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Hello! I'm JOURNALIST MOAI 🗿\n\nI'm ready to answer your questions about cryptocurrencies, blockchain technology, or any other topic.`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [lastSearchTerm, setLastSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastNewsData, setLastNewsData] = useState<ScoredArticle[]>([]);
  const [lastNewsIndex, setLastNewsIndex] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);

  // Token verification effect
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
          setHasToken(amount >= 100000);
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

  // Watch for new messages and update lastMessageTime
  useEffect(() => {
    if (messages.length > 0 && !isMessageLoading) {
      setLastMessageTime(Date.now());
    }
  }, [messages, isMessageLoading]);

  // Show suggestions 3 seconds after the last message
  useEffect(() => {
    if (lastMessageTime > 0 && !isMessageLoading) {
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
  }, [lastMessageTime, isMessageLoading, lastSearchTerm, userLanguage]);

  // When component mounts, show initial suggestions
  useEffect(() => {
    const initialSuggestions = [
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

    setIsMessageLoading(true);
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

ÖNEMLİ: Her haberi mutlaka Türkçe'ye çevir. Çeviri yapmadan asla geçme.

JSON formatında dön:
{
  "title": "çevrilmiş başlık",
  "content": "çevrilmiş içerik"
}` :
                `You are a professional translator and crypto news editor. Keep the news in English but summarize if needed. Keep technical terms and cryptocurrency names unchanged.

Return in JSON format:
{
  "title": "title",
  "content": "content"
}`
            },
            {
              role: "user",
              content: `Title: ${news.title}\nContent: ${news.content}`
            }
          ],
          model: "gpt-4",
          response_format: { type: "json_object" }
        });

        try {
          const translatedText = JSON.parse(translation.choices[0]?.message?.content || "{}");
          
          // Always use translated text for Turkish users, force translation
          const finalTitle = userLanguage === 'tr' ? 
            (translatedText.title || await translateText(news.title)) : 
            news.title;
            
          const finalContent = userLanguage === 'tr' ? 
            (translatedText.content || await translateText(news.content)) : 
            news.content;

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
                  5. Sadece en önemli bilgilere odaklan
                  6. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak` :
                  `You are a news editor who makes quick and clear summaries.
                  
                  Rules:
                  1. Summarize the news in 2 short paragraphs
                  2. First paragraph for the main topic
                  3. Second paragraph for important details
                  4. Use short and concise sentences
                  5. Focus only on the most important information
                  6. Keep technical terms and cryptocurrency names unchanged`
              },
              {
                role: "user",
                content: `${finalTitle}\n\n${finalContent}`
              }
            ],
            model: "gpt-3.5-turbo",
          });

          const translationIndicator = userLanguage === 'tr' ? '🔄 ' : '';
          const summaryContent = summary.choices[0]?.message?.content || finalContent;
          
          setMessages(prev => [...prev, {
            type: 'bot',
            content: `${translationIndicator}${finalTitle}\n\n${summaryContent}\n\nKaynak: <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
          }]);
        } catch (error) {
          console.error('News processing error:', error);
        }
      } catch (error) {
        console.error('News processing error:', error);
      }
    }
    setIsMessageLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent, directMessage?: string) => {
    e?.preventDefault();
    
    const searchText = directMessage || input;
    if (!searchText.trim()) return;
    
    setInput('');
    setLastSearchTerm(searchText);
    setMessages(prev => [...prev, { type: 'user', content: searchText }]);
    setIsMessageLoading(true);

    try {
      // Translate search terms to English while keeping original for display
      const englishSearchTerms = await translateSearchTerms(searchText);
      const searchTerms = englishSearchTerms.toLowerCase().split(' ');
      
      // Display the search message in Turkish
      const searchMessage = userLanguage === 'tr' ? 
        `🗞️ ${searchText.toUpperCase()} hakkında ` :
        `🗞️ Found news about ${searchText.toUpperCase()} `;

      setMessages(prev => [...prev, {
        type: 'bot',
        content: searchMessage
      }]);

      // Rest of the search logic using englishSearchTerms
      const response = await fetch(`/api/news?q=${encodeURIComponent(englishSearchTerms)}`);
      if (!response.ok) {
        throw new Error(`News API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.news_results || !data.news_results.length) {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: userLanguage === 'tr' ?
            'Üzgünüm, bu konu hakkında güncel haber bulamadım.' :
            'Sorry, I could not find any recent news on this topic.'
        }]);
        setIsMessageLoading(false);
        return;
      }

      // Alakalılık skorunu hesapla ve haberleri filtrele
      const scoredNews = data.news_results
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
          if (combinedText.includes(searchText.toLowerCase())) {
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

ÖNEMLİ: Her haberi mutlaka Türkçe'ye çevir. Çeviri yapmadan asla geçme.

JSON formatında dön:
{
  "title": "çevrilmiş başlık",
  "content": "çevrilmiş içerik"
}` :
                  `You are a professional translator and crypto news editor. Keep the news in English but summarize if needed. Keep technical terms and cryptocurrency names unchanged.

Return in JSON format:
{
  "title": "title",
  "content": "content"
}`
              },
              {
                role: "user",
                content: `Title: ${news.title}\nContent: ${news.content}`
              }
            ],
            model: "gpt-4",
            response_format: { type: "json_object" }
          });

          try {
            const translatedText = JSON.parse(translation.choices[0]?.message?.content || "{}");
            
            // Always use translated text for Turkish users, force translation
            const finalTitle = userLanguage === 'tr' ? 
              (translatedText.title || await translateText(news.title)) : 
              news.title;
              
            const finalContent = userLanguage === 'tr' ? 
              (translatedText.content || await translateText(news.content)) : 
              news.content;

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
                    5. Sadece en önemli bilgilere odaklan
                    6. Teknik terimleri ve kripto para isimlerini olduğu gibi bırak` :
                    `You are a news editor who makes quick and clear summaries.
                    
                    Rules:
                    1. Summarize the news in 2 short paragraphs
                    2. First paragraph for the main topic
                    3. Second paragraph for important details
                    4. Use short and concise sentences
                    5. Focus only on the most important information
                    6. Keep technical terms and cryptocurrency names unchanged`
                },
                {
                  role: "user",
                  content: `${finalTitle}\n\n${finalContent}`
                }
              ],
              model: "gpt-3.5-turbo",
            });

            const translationIndicator = userLanguage === 'tr' ? '🔄 ' : '';
            const summaryContent = summary.choices[0]?.message?.content || finalContent;
            
            setMessages(prev => [...prev, {
              type: 'bot',
              content: `${translationIndicator}${finalTitle}\n\n${summaryContent}\n\nKaynak: <a href="${news.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${news.sourceText}</a>`
            }]);
          } catch (error) {
            console.error('News processing error:', error);
          }
        } catch (error) {
          console.error('News processing error:', error);
        }
      }
      setIsMessageLoading(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: userLanguage === 'tr' ?
          'Üzgünüm, haberleri getirirken bir hata oluştu. Lütfen tekrar deneyin.' :
          'Sorry, an error occurred while fetching the news. Please try again.'
      }]);
    }

    setIsMessageLoading(false);
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
          <div className="relative z-[100] pointer-events-auto">
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 transition-colors !cursor-pointer pointer-events-auto" />
          </div>
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
          <p className="text-blue-300 mb-2">You need to hold at least 100,000 MOAI tokens to access this feature</p>
          <p className="text-blue-400/80 text-sm mb-8">Current holdings are insufficient</p>
          <div className="flex flex-col gap-3">
            <a 
              href="YOUR_TOKEN_PURCHASE_LINK" 
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

  // Update header to include wallet connection controls
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="w-full p-6 bg-black/30 backdrop-blur-sm border-b border-blue-900/30">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
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
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Journalist MOAI</h1>
              <p className="text-sm text-blue-300/80">Crypto News Assistant</p>
            </div>
          </div>
          
          {/* Wallet Connection Controls */}
          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <div className="text-right">
                  <p className="text-sm text-blue-300/80">Connected Wallet</p>
                  <p className="text-xs text-blue-400/60 truncate max-w-[150px]">
                    {publicKey?.toBase58()}
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(disconnect)}
                  className="p-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors"
                  title="Disconnect Wallet"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="relative z-[100] pointer-events-auto">
                <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 transition-colors !cursor-pointer pointer-events-auto" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-blue-600/50 hover:[&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full"
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
        {isMessageLoading && (
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
        {suggestions.length > 0 && !isMessageLoading && (
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
              disabled={isMessageLoading}
              className="flex-1 bg-gray-800/80 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 placeholder-gray-400 backdrop-blur-sm"
            />
            <button
              type="submit"
              disabled={isMessageLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 font-medium"
            >
              {isMessageLoading ? 'Responding...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 