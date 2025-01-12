'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AccountLayout } from '@solana/spl-token';

// Add TradingView and Phantom types
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
    phantom?: any;
    solana?: any;
  }
}

type Message = {
  type: 'user' | 'bot';
  content: string;
  chart?: {
    symbol: string;
    interval?: string;
  };
  timestamp?: number;
  coin?: CoinSuggestion;
};

// Add ChatGPT message type
type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = {
  role: ChatRole;
  content: string;
};

// TradingView sembol önbellek sistemi
let symbolCache: Map<string, string> = new Map();
let lastCacheTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 saat

// TradingView'den sembol arama
const searchTradingViewSymbol = async (query: string): Promise<string> => {
  try {
    const cacheKey = query.toLowerCase();
    const now = Date.now();
    if (symbolCache.has(cacheKey) && (now - lastCacheTime) < CACHE_DURATION) {
      return symbolCache.get(cacheKey)!;
    }

    // First try Binance API as it's most reliable
    try {
      const binanceResponse = await fetch(`/api/binance?symbol=${query}USDT`);
      if (binanceResponse.ok) {
        const symbol = `BINANCE:${query}USDT`;
        symbolCache.set(cacheKey, symbol);
        lastCacheTime = now;
        return symbol;
      }
    } catch (e) {
      console.debug('Binance check failed, trying TradingView');
    }

    // If all fails, return default format
    const defaultSymbol = `${query.toUpperCase()}USDT`;
    symbolCache.set(cacheKey, defaultSymbol);
    lastCacheTime = now;
    return defaultSymbol;
  } catch (error) {
    console.debug('Symbol search error:', error);
    return `${query.toUpperCase()}USDT`;
  }
};

// Coin sembolünü doğru exchange ile birleştiren yardımcı fonksiyon
const getFormattedSymbol = async (symbol: string): Promise<string> => {
  try {
    const cleanSymbol = symbol.replace(/(USDT|USDC)$/, '').toUpperCase();
    
    // Try Binance first (most liquid exchange)
    try {
      const binanceResponse = await fetch(`/api/binance?symbol=${cleanSymbol}USDT`);
      if (binanceResponse.ok) {
        const data = await binanceResponse.json();
        if (data.volume) {
          return `BINANCE:${cleanSymbol}USDT`;
        }
      }
    } catch (e) {
      console.debug('Binance check failed');
    }

    // Default to USDT pair if nothing else works
    return `${cleanSymbol}USDT`;
  } catch (error) {
    console.debug('Error checking exchanges:', error);
    return `${symbol.toUpperCase()}USDT`;
  }
};

interface ChartData {
  price: number | null;
  rsi: number | null;
  sma: {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
  };
  bb: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
  supports: number[];
  resistances: number[];
  market_data: {
    price_change_24h: number;
    volume_24h: number;
    market_cap: number;
    high_24h: number;
    low_24h: number;
    ath: number;
    ath_change_percentage: number;
    atl: number;
    atl_change_percentage: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    total_volume: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number;
  };
  trends: {
    volume_trend: number[];
    price_trend: number[];
    market_cap_trend: number[];
  };
  ohlc: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  volumeProfile: Array<{
    price: number;
    volume: number;
  }>;
}

interface StudyValues {
  name: string;
  values: number[];
}

interface SymbolInfo {
  symbol: string;
  price: number;
}

interface SeriesData {
  close: number;
  open: number;
  high: number;
  low: number;
  time: number;
}

// Add new types for coin suggestions
type CoinSuggestion = {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
};

interface PhantomSolana {
  disconnect(): Promise<void>;
}

declare global {
  interface Window {
    phantom?: any;
    solana?: any;
  }
}

// TradingView Widget Component
const TradingViewWidget = ({ symbol, interval = '1D', onChartReady, isFullscreen }: { 
  symbol: string, 
  interval?: string, 
  onChartReady?: (widget: any) => void,
  isFullscreen?: boolean 
}) => {
  const widgetRef = useRef<any>(null);
  const containerId = useRef(`tradingview_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    let widget: any = null;
    const container = document.getElementById(containerId.current);
    if (!container) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined') {
        try {
          widget = new window.TradingView.widget({
            width: "100%",
            height: isFullscreen ? window.innerHeight : 400,
            symbol: symbol,
            interval: interval,
            timezone: "exchange",
            theme: "dark",
            style: "1",
            locale: "en",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            hide_top_toolbar: true,
            save_image: false,
            container_id: containerId.current,
            library_path: "https://s3.tradingview.com/tv.js",
            auto_save_delay: 5,
            debug: false,
            studies: [
              "ZigZag@tv-basicstudies",
              "RSI@tv-basicstudies",
              "MACD@tv-basicstudies",
              "Volume@tv-basicstudies",
              "BB@tv-basicstudies"
            ],
            studies_overrides: {
              "zigzag.deviation": 5,
              "volume.volume.color.0": "#eb4d5c",
              "volume.volume.color.1": "#53b987",
              "volume.volume.transparency": 50,
              "macd.signal.color": "#FF9800",
              "macd.macd.color": "#2196F3",
              "macd.histogram.color": "#673AB7"
            },
            disabled_features: [
              "use_localstorage_for_settings",
              "header_widget",
              "header_symbol_search",
              "symbol_search_hot_key",
              "header_resolutions",
              "header_interval_dialog_button",
              "show_interval_dialog_on_key_press",
              "header_chart_type",
              "header_settings",
              "header_indicators",
              "header_compare",
              "header_undo_redo",
              "header_screenshot",
              "header_fullscreen_button",
              "border_around_the_chart",
              "left_toolbar",
              "volume_force_overlay"
            ],
            enabled_features: [
              "study_templates",
              "remove_library_container_border"
            ]
          });

          widgetRef.current = widget;

          // Only set up onChartReady if widget supports it
          if (typeof widget.onChartReady === 'function' && onChartReady) {
            widget.onChartReady(() => {
              console.debug('Chart is ready');
              onChartReady(widget);
            });
          }
        } catch (error) {
          console.debug('Widget initialization error:', error);
        }
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (container) {
        container.innerHTML = '';
      }
      widgetRef.current = null;
    };
  }, [symbol, interval, onChartReady, isFullscreen]);

  return (
    <div className="tradingview-widget-container h-full">
      <div id={containerId.current} className={`w-full ${isFullscreen ? 'h-screen' : 'h-[400px]'} rounded-xl overflow-hidden`} />
    </div>
  );
};

// CoinGecko ID resolver
const getCoinGeckoId = async (symbol: string): Promise<string | null> => {
  try {
    const cleanSymbol = symbol.replace(/USDT$/, '').toLowerCase();
    
    // Special cases for specific coins
    const specialCases: { [key: string]: string } = {
      'goat': 'goatseus-maximus',
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'bnb': 'binancecoin',
      'sol': 'solana',
      'doge': 'dogecoin',
      'xrp': 'ripple',
      'ada': 'cardano',
      'avax': 'avalanche-2',
      'matic': 'matic-network',
      'dot': 'polkadot',
      'link': 'chainlink',
      'uni': 'uniswap',
      'atom': 'cosmos'
    };

    if (specialCases[cleanSymbol]) {
      return specialCases[cleanSymbol];
    }

    // Get list of all coins from CoinGecko through our proxy
    const response = await fetch('/api/coingecko?endpoint=coins/list');
    const coins = await response.json();
    
    // Try to find exact match by symbol first
    let coin = coins.find((c: any) => c.symbol.toLowerCase() === cleanSymbol);
    
    // If not found by symbol, try searching by id or name
    if (!coin) {
      coin = coins.find((c: any) => 
        c.id.toLowerCase() === cleanSymbol ||
        c.name.toLowerCase() === cleanSymbol
      );
    }

    // If still not found, try partial matches
    if (!coin) {
      coin = coins.find((c: any) => 
        c.id.toLowerCase().includes(cleanSymbol) ||
        c.name.toLowerCase().includes(cleanSymbol)
      );
    }

    // Verify the found coin by checking its price data
    if (coin) {
      try {
        const priceCheck = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`);
        const priceData = await priceCheck.json();
        
        // If price data exists, return the coin id
        if (priceData[coin.id]?.usd) {
          return coin.id;
        }
      } catch (e) {
        console.error('Error verifying coin price:', e);
      }
    }
    
    // If no valid coin found or price verification failed, return null
    return null;
  } catch (error) {
    console.error('Error resolving CoinGecko ID:', error);
    return null;
  }
};

// Function to get chart data
const getChartData = async (symbol: string): Promise<ChartData | null> => {
  try {
    const coinId = await getCoinGeckoId(symbol);
    if (!coinId) {
      console.error('Could not find CoinGecko ID for symbol:', symbol);
      return null;
    }

    // Get detailed coin data with market data
    const coinResponse = await fetch(`/api/coingecko?endpoint=coins/${coinId}&params=localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`);
    if (!coinResponse.ok) {
      const error = await coinResponse.json();
      console.error('Coin data fetch error:', error);
      return null;
    }
    const coinData = await coinResponse.json();

    // Get historical price data
    const historicalResponse = await fetch(`/api/coingecko?endpoint=coins/${coinId}/market_chart`);
    if (!historicalResponse.ok) {
      const error = await historicalResponse.json();
      console.error('Historical data fetch error:', error);
      return null;
    }
    const historicalData = await historicalResponse.json();

    // Get OHLCV data
    const ohlcResponse = await fetch(`/api/coingecko?endpoint=coins/${coinId}/ohlc`);
    if (!ohlcResponse.ok) {
      const error = await ohlcResponse.json();
      console.error('OHLC data fetch error:', error);
      return null;
    }
    const ohlcData = await ohlcResponse.json();

    if (!historicalData.prices || historicalData.prices.length === 0) {
      console.error('No historical data received from CoinGecko for:', symbol);
      return null;
    }

    // Process price data
    const prices = historicalData.prices.map((p: any) => p[1]);
    const volumes = historicalData.total_volumes?.map((v: any) => v[1]) || Array(prices.length).fill(0);
    const marketCaps = historicalData.market_caps?.map((m: any) => m[1]) || Array(prices.length).fill(0);
    const currentPrice = prices[prices.length - 1];

    // Process OHLC data
    const ohlc = ohlcData.map((d: number[]) => ({
      time: d[0],
      open: d[1],
      high: d[2],
      low: d[3],
      close: d[4]
    }));

    // Calculate RSI with more accurate data
    const rsiPeriod = 14;
    const changes = prices.slice(1).map((price: number, i: number) => price - prices[i]);
    const gains = changes.map((change: number) => change > 0 ? change : 0);
    const losses = changes.map((change: number) => change < 0 ? -change : 0);
    
    const avgGain = gains.slice(-rsiPeriod).reduce((a: number, b: number) => a + b, 0) / rsiPeriod;
    const avgLoss = losses.slice(-rsiPeriod).reduce((a: number, b: number) => a + b, 0) / rsiPeriod;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Calculate multiple SMAs
    const sma20 = prices.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const sma50 = prices.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;
    const sma200 = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;

    // Calculate Bollinger Bands with more precision
    const bbPeriod = 20;
    const bbMultiplier = 2;
    const bbPrices = prices.slice(-bbPeriod);
    const bbSMA = bbPrices.reduce((a: number, b: number) => a + b, 0) / bbPeriod;
    const bbStdDev = Math.sqrt(bbPrices.reduce((sum: number, price: number) => sum + Math.pow(price - bbSMA, 2), 0) / bbPeriod);

    // Calculate volume profile
    interface VolumeLevel {
      price: number;
      volume: number;
    }

    const volumeProfile = ohlc.reduce((acc: VolumeLevel[], candle: SeriesData) => {
      const priceLevel = Math.floor(candle.close / (currentPrice * 0.01)) * (currentPrice * 0.01);
      const existingLevel = acc.find(level => level.price === priceLevel);
      if (existingLevel) {
        existingLevel.volume += 1;
      } else {
        acc.push({ price: priceLevel, volume: 1 });
      }
      return acc;
    }, []).sort((a: VolumeLevel, b: VolumeLevel) => b.volume - a.volume);

    // Find support and resistance using volume profile
    const significantLevels = volumeProfile
      .filter((level: VolumeLevel) => level.volume > volumeProfile[0].volume * 0.3)
      .map((level: VolumeLevel) => level.price);

    const supports = significantLevels.filter((level: number) => level < currentPrice).slice(0, 3);
    const resistances = significantLevels.filter((level: number) => level > currentPrice).slice(0, 3);

    return {
      price: Number(currentPrice.toFixed(5)),
      rsi: Number(rsi.toFixed(2)),
      sma: {
        sma20: Number(sma20.toFixed(5)),
        sma50: Number(sma50.toFixed(5)),
        sma200: Number(sma200.toFixed(5))
      },
      bb: {
        upper: Number((bbSMA + bbMultiplier * bbStdDev).toFixed(5)),
        middle: Number(bbSMA.toFixed(5)),
        lower: Number((bbSMA - bbMultiplier * bbStdDev).toFixed(5))
      },
      supports: supports.map((level: number) => Number(level.toFixed(5))),
      resistances: resistances.map((level: number) => Number(level.toFixed(5))),
      market_data: {
        price_change_24h: Number(coinData.market_data?.price_change_percentage_24h?.toFixed(2)) || 0,
        volume_24h: Number(coinData.market_data?.total_volume?.usd?.toFixed(0)) || 0,
        market_cap: Number(coinData.market_data?.market_cap?.usd?.toFixed(0)) || 0,
        high_24h: Number(coinData.market_data?.high_24h?.usd?.toFixed(5)) || 0,
        low_24h: Number(coinData.market_data?.low_24h?.usd?.toFixed(5)) || 0,
        ath: Number(coinData.market_data?.ath?.usd?.toFixed(5)) || 0,
        ath_change_percentage: Number(coinData.market_data?.ath_change_percentage?.usd?.toFixed(2)) || 0,
        atl: Number(coinData.market_data?.atl?.usd?.toFixed(5)) || 0,
        atl_change_percentage: Number(coinData.market_data?.atl_change_percentage?.usd?.toFixed(2)) || 0,
        price_change_percentage_7d: Number(coinData.market_data?.price_change_percentage_7d?.toFixed(2)) || 0,
        price_change_percentage_30d: Number(coinData.market_data?.price_change_percentage_30d?.toFixed(2)) || 0,
        total_volume: Number(coinData.market_data?.total_volume?.usd?.toFixed(0)) || 0,
        circulating_supply: Number(coinData.market_data?.circulating_supply?.toFixed(0)) || 0,
        total_supply: Number(coinData.market_data?.total_supply?.toFixed(0)) || 0,
        max_supply: Number(coinData.market_data?.max_supply?.toFixed(0)) || 0
      },
      trends: {
        volume_trend: volumes.slice(-7).map((v: number) => Number(v.toFixed(0))),
        price_trend: prices.slice(-7).map((p: number) => Number(p.toFixed(5))),
        market_cap_trend: marketCaps.slice(-7).map((m: number) => Number(m.toFixed(0)))
      },
      ohlc: ohlc.slice(-30).map((candle: SeriesData) => ({
        time: candle.time,
        open: Number(candle.open.toFixed(5)),
        high: Number(candle.high.toFixed(5)),
        low: Number(candle.low.toFixed(5)),
        close: Number(candle.close.toFixed(5))
      })),
      volumeProfile: volumeProfile.slice(0, 10).map((level: VolumeLevel) => ({
        price: Number(level.price.toFixed(5)),
        volume: level.volume
      }))
    };
  } catch (error) {
    console.error('Error fetching data from CoinGecko:', error);
    return null;
  }
};

const MOAI_TOKEN_ADDRESS = '2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M';
const SOLANA_RPC_URL = 'https://solana-mainnet.rpc.extrnode.com/a6f9fc24-29e2-43fb-8f5c-de216933db71';
const MINIMUM_TOKEN_VALUE_USD = 50; // Minimum required token value in USD

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

// Add helper function to extract coin symbol from message
const extractCoinSymbol = (message: string): string | null => {
  // Common coin name to symbol mapping
  const commonCoins: { [key: string]: string } = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'solana': 'SOL',
    'cardano': 'ADA',
    'ripple': 'XRP',
    'dogecoin': 'DOGE',
    'polkadot': 'DOT',
    'avalanche': 'AVAX',
    'binance': 'BNB',
    'matic': 'MATIC',
    'polygon': 'MATIC'
  } as const;

  // Convert message to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();

  // First check for common coin names
  for (const [name, symbol] of Object.entries(commonCoins)) {
    if (lowerMessage.includes(name)) {
      return symbol;
    }
  }

  // Then check for ticker symbols (3-5 characters followed by optional USDT)
  const symbolPattern = /\b[A-Za-z]{3,5}(?:USDT)?\b/g;
  const matches = message.match(symbolPattern);
  
  if (!matches) return null;
  
  // Filter out common words that might match the pattern
  const commonWords = ['USDT', 'WHAT', 'WHEN', 'WHERE', 'WILL', 'DOES', 'THIS', 'THAT', 'HELP', 'LOOK', 'TELL'];
  const possibleSymbols = matches.filter(match => !commonWords.includes(match.toUpperCase()));
  
  return possibleSymbols[0]?.toUpperCase() || null;
};

// Add function to check if message is asking for coin analysis
const isRequestingCoinAnalysis = (message: string): boolean => {
  const coinAnalysisKeywords = [
    'price', 'analysis', 'analyze', 'chart', 'prediction', 'target', 'forecast',
    'fiyat', 'analiz', 'hedef', 'grafik', 'tahmin'
  ];
  
  return coinAnalysisKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
};

// Add secure API call function
const callOpenAI = async (messages: any[], model: string = 'gpt-3.5-turbo') => {
  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API call failed');
    }

    return await response.json();
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

export default function AnalistMoai() {
  const hasCheckedBalance = useRef(false);
  const { publicKey, connected, disconnect } = useWallet();
  const [hasToken, setHasToken] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: "Hello! I'm Analyst MOAI 🗿\n\nI can help you with technical analysis and price predictions in crypto markets. Please specify a coin you'd like me to analyze. For example: 'BTC analysis' or 'ETH price prediction'",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [chartWidget, setChartWidget] = useState<any>(null);
  const [fullscreenChart, setFullscreenChart] = useState<{symbol: string, interval?: string} | null>(null);
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>(() => {
    // Try to detect browser language, default to 'en' if not Turkish
    const browserLang = typeof window !== 'undefined' ? window.navigator.language.toLowerCase() : 'en';
    return browserLang.startsWith('tr') ? 'tr' : 'en';
  });
  const [suggestions, setSuggestions] = useState<CoinSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinSuggestion | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if site is in maintenance mode
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

  const placeholders = {
    en: [
      "Can you do technical analysis for Bitcoin?",
      "What's the price target for Ethereum?",
      "Analyze BTC/USD chart",
      "How's the market looking?",
      "When will altcoin season start?",
    ],
    tr: [
      "Bitcoin için teknik analiz yapar mısın?",
      "Ethereum için hedef fiyat nedir?",
      "BTC/USD grafiğini analiz et",
      "Piyasa nasıl görünüyor?",
      "Altcoin sezonu ne zaman başlayacak?",
    ]
  };

  // Placeholder effect
  useEffect(() => {
    if (!placeholders[userLanguage]) return;

    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);
    }, 3000);

    // Set initial placeholder
    setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);

    return () => clearInterval(interval);
  }, [userLanguage, placeholders]);

  // Click outside handler effect
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Cleanup effect for debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // If in maintenance mode, show maintenance page
  if (isMaintenance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="relative w-24 h-24 mb-8">
          <Image
            src="/moai.webp"
            alt="MOAI"
            width={96}
            height={96}
            className="rounded-full ring-4 ring-purple-500/50"
          />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">🚧 Bakım Modu</h1>
        <p className="text-purple-300 text-center max-w-md mb-8">
          Analyst MOAI şu anda bakımda. Daha iyi hizmet verebilmek için çalışıyoruz. Lütfen daha sonra tekrar deneyin.
        </p>
        <div className="text-purple-400/60 text-sm">
          Estimated completion: Soon™
        </div>
      </div>
    );
  }

  // Rest of the component code...
  // ... existing code ...

  // Replace img elements with Image components
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* ... existing code ... */}
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-4 py-2 rounded-lg transition-all duration-200 
            border border-purple-500/50 text-purple-400 hover:text-purple-300
            shadow-[0_0_10px_0] shadow-purple-500/20 bg-black/80 backdrop-blur-md
            hover:shadow-[0_0_15px_0] hover:shadow-purple-500/30 hover:border-purple-400/50 text-sm
            flex items-center gap-2"
        >
          <Image
            src={suggestion.thumb}
            alt={suggestion.name}
            width={20}
            height={20}
            className="rounded-full"
          />
          <span>{suggestion.symbol}</span>
        </button>
      ))}
      {/* ... rest of the code ... */}
    </div>
  );
}