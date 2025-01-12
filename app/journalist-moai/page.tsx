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

export default function JournalistMoai() {
  const hasCheckedBalance = useRef(false);
  const { publicKey, connected, disconnect } = useWallet();
  const [hasToken, setHasToken] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Hello! I'm JOURNALIST MOAI 🗿️\n\nI'm ready to answer your questions about cryptocurrencies, blockchain technology, or any other topic.`
    }
  ]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>('en');
  const [lastSearchTerm, setLastSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastNewsData, setLastNewsData] = useState<ScoredArticle[]>([]);
  const [lastNewsIndex, setLastNewsIndex] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);

  // Add relevance score calculation function
  function calculateRelevanceScore(article: any, searchTerm: string): number {
    const combinedText = `${article.title} ${article.content}`.toLowerCase();
    const searchTerms = searchTerm.toLowerCase().split(' ');
    
    let score = 0;
    let matchedTerms = 0;

    searchTerms.forEach(term => {
      if (combinedText.includes(term)) {
        matchedTerms++;
        score += 1;
      }
    });

    if (matchedTerms === searchTerms.length) {
      score += 2;
    }

    if (combinedText.includes(searchTerm.toLowerCase())) {
      score += 3;
    }

    const cryptoSites = ['cointelegraph.com', 'coindesk.com', 'decrypt.co', 'theblockcrypto.com', 'cryptonews.com'];
    if (article.link) {
      cryptoSites.forEach(site => {
        if (article.link.includes(site)) {
          score += 0.5;
        }
      });
    }

    return score;
  }

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
                    1. İlk öneri her zaman "Daha fazla [TAM ARAMA TERİMİ] haberi" olsun
                    2. Diğer öneriler aynı konuyla ilgili farklı açılardan haberler olsun
                    3. Çok kısa ve net olsun (2-4 kelime)
                    4. Sadece haber araması olacak şekilde yaz
                    5. Ana terimi asla parçalama, tam olarak kullan
                    
                    Örnek - "ethereum pectra" için:
                    {
                      "suggestions": [
                        "Daha fazla ethereum pectra haberi",
                        "Ethereum pectra gelişmeleri",
                        "Ethereum pectra güncellemeler"
                      ]
                    }
                    
                    Örnek - "bitcoin layer 2" için:
                    {
                      "suggestions": [
                        "Daha fazla bitcoin layer 2 haberi",
                        "Bitcoin layer 2 projeleri",
                        "Bitcoin layer 2 entegrasyonları"
                      ]
                    }
                    
                    Cevabı JSON formatında dön.` :
                    `Suggest 3 different news searches related to the given term and return in JSON format.
                    
                    Important rules:
                    1. First suggestion should always be "More [EXACT SEARCH TERM] news"
                    2. Other suggestions should be different aspects of the same topic
                    3. Keep it very short and clear (2-4 words)
                    4. Write only as news searches
                    5. Never split the main term, use it exactly
                    
                    Example - for "ethereum pectra":
                    {
                      "suggestions": [
                        "More ethereum pectra news",
                        "Ethereum pectra updates",
                        "Ethereum pectra development"
                      ]
                    }
                    
                    Example - for "bitcoin layer 2":
                    {
                      "suggestions": [
                        "More bitcoin layer 2 news",
                        "Bitcoin layer 2 projects",
                        "Bitcoin layer 2 integrations"
                      ]
                    }
                    
                    Return response in JSON format.`,
                },
                {
                  role: "user",
                  content: lastSearchTerm
                }
              ],
              model: "gpt-3.5-turbo",
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
          // Get clean search term for suggestions
          const cleanTerm = lastSearchTerm.toLowerCase()
            .replace(/(haberler|haberleri|haber|news|latest|updates|güncel|son|durum)/g, '')
            .trim();

          // Initial suggestions (news topics)
          const newSuggestions = userLanguage === 'tr' ? [
            `${cleanTerm} hakkında daha fazla haber`,
            `${cleanTerm} gelişmeleri`,
            `${cleanTerm} güncellemeler`
          ] : [
            `More news about ${cleanTerm}`,
            `${cleanTerm} updates`,
            `${cleanTerm} developments`
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
      'Kripto para haberleri',
      'Yapay zeka gelişmeleri',
      'Blockchain projeleri'
    ] : [
      'Cryptocurrency news',
      'AI developments',
      'Blockchain projects'
    ];
    setSuggestions(initialSuggestions);
    setTimeout(() => {
      setShowSuggestions(true);
    }, 100);
  }, [userLanguage]);

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

    setIsLoading(true);
    const nextBatch = lastNewsData.slice(lastNewsIndex, lastNewsIndex + 5);
    setLastNewsIndex(prev => prev + 5);

    // Check if the last search was in Turkish
    const isTurkishQuery = /[çğıöşüÇĞİÖŞÜ]|haberleri|haber|güncel|son|durum/.test(lastSearchTerm.toLowerCase());

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
          model: "gpt-4-turbo-preview",
          response_format: { type: "json_object" }
        });

        try {
          const translatedText = JSON.parse(translation.choices[0]?.message?.content || "{}");
          
          // Always translate if the query was in Turkish
          const finalTitle = isTurkishQuery ? 
            (translatedText.title || await translateText(news.title)) : 
            news.title;
            
          const finalContent = isTurkishQuery ? 
            (translatedText.content || await translateText(news.content)) : 
            news.content;

          const summary = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: isTurkishQuery ?
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

          const translationIndicator = isTurkishQuery ? '🔄 ' : '';
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
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | null, directMessage?: string) => {
    e?.preventDefault();
    
    const userMessage = directMessage || searchText;
    if (!userMessage.trim()) return;

    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setSearchText('');
    setIsLoading(true);

    // Check if query is in Turkish
    const isTurkishQuery = /[çğıöşüÇĞİÖŞÜ]|haberleri|haber|güncel|son|durum/.test(userMessage.toLowerCase());

    try {
      // Clean search text and extract main term
      const cleanedText = userMessage.toLowerCase().replace(/(haberler|haberleri|haber|news|latest|updates|güncel|son|durum)/g, '').trim();
      const mainSearchTerm = cleanedText.split(' ')[0];

      // Try primary news source first
      let response = await fetch(`/api/news?q=${encodeURIComponent(mainSearchTerm)}`);
      let data;
      
      // If primary source fails, try CryptoCompare API as fallback
      if (!response.ok) {
        console.log('Primary news source failed, trying fallback...');
        response = await fetch(`https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${encodeURIComponent(mainSearchTerm)}`);
        data = await response.json();
        
        if (data?.Data) {
          // Transform CryptoCompare data to match our format
          data.articles = data.Data.map((article: any) => ({
            title: article.title,
            content: article.body,
            link: article.url,
            source: article.source,
            sourceUrl: article.url,
            sourceText: article.source_info?.name || article.source,
            date: new Date(article.published_on * 1000).toISOString()
          }));
        }
      } else {
        data = await response.json();
      }

      if (!data?.articles?.length) {
        throw new Error('No news found');
      }

      // Process news articles
      const scoredNews = data.articles.map((article: any) => ({
        ...article,
        title: article.title,
        content: article.content || article.snippet || article.body,
        link: article.link || article.url,
        score: calculateRelevanceScore(article, mainSearchTerm)
      })).sort((a: any, b: any) => b.score - a.score);

      // Store news data for later use
      setLastNewsData(scoredNews);
      setLastNewsIndex(5);
      setLastSearchTerm(mainSearchTerm);

      // Display result count message
      const resultCount = scoredNews.length;
      const resultMessage = isTurkishQuery ? 
        `🗞️ ${userMessage.toUpperCase()} hakkında ${resultCount} haber buldum:` :
        `🗞️ Found ${resultCount} news about ${userMessage.toUpperCase()}:`;
      
      setMessages(prev => [...prev, { type: 'bot', content: resultMessage }]);

      // Display first batch of news articles
      const firstBatch = scoredNews.slice(0, 5);
      for (const article of firstBatch) {
        try {
          const title = isTurkishQuery ? await translateText(article.title) : article.title;
          const content = isTurkishQuery ? await translateText(article.content) : article.content;
          
          const newsMessage = `📰 ${title}\n\n${content}\n\n🔗 Source: ${article.sourceUrl || article.link}`;
          setMessages(prev => [...prev, { type: 'bot', content: newsMessage }]);
        } catch (error) {
          console.error('Error processing article:', error);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = isTurkishQuery ? 
        'Üzgünüm, şu anda haber kaynağına erişimde sorun yaşıyorum. Lütfen birkaç dakika sonra tekrar deneyin.' :
        'Sorry, I am having trouble accessing the news source right now. Please try again in a few minutes.';
      
      setMessages(prev => [...prev, {
        type: 'bot',
        content: errorMessage
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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
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