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

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

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

  // Placeholder effect
  useEffect(() => {
    if (!placeholders[userLanguage]) return;

    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);
    }, 3000);

    // Set initial placeholder
    setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);

    return () => clearInterval(interval);
  }, [userLanguage]);

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

  // Add function to fetch coin suggestions
  const fetchCoinSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      // Check if there are any coin results before processing
      if (!data.coins || data.coins.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      // Filter and format suggestions, limit to 3
      const formattedSuggestions = data.coins
        .slice(0, 3) // Limit to 3 suggestions
        .map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          thumb: coin.thumb
        }));
      
      // Only show suggestions if we have results
      if (formattedSuggestions.length > 0) {
        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Modify input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Only fetch suggestions if no coin is selected
    if (!selectedCoin) {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for 2 seconds
      debounceTimerRef.current = setTimeout(() => {
        fetchCoinSuggestions(value);
      }, 500);
    } else {
      // Clear any existing suggestions
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Add cleanup for debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update suggestion click handler
  const handleSuggestionClick = (suggestion: CoinSuggestion) => {
    setSelectedCoin(suggestion);
    setInput('');
    setShowSuggestions(false);
  };

  // Add clear selection handler
  const handleClearSelection = () => {
    setSelectedCoin(null);
    setInput('');
  };

  // Add function to handle input with selected coin
  const handleSubmitWithCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCoin && !input.trim()) return;

    const userInput = input.trim();
    setInput('');
    setSelectedCoin(null);
    setIsMessageLoading(true);

    try {
      // First, detect the language
      const languageDetection = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a language detector. Analyze the given text and return ONLY "tr" for Turkish or "en" for English in your response. Nothing else.`
          },
          {
            role: "user",
            content: userInput
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const detectedLanguage = languageDetection.choices[0]?.message?.content?.trim().toLowerCase() as 'en' | 'tr';
      setUserLanguage(detectedLanguage);

      // If no coin is selected, check if the message is requesting coin analysis
      if (!selectedCoin && !isRequestingCoinAnalysis(userInput)) {
        // Add user's message first
        const userMessage: Message = {
          type: 'user',
          content: userInput,
          timestamp: Date.now()
        };

        // Add bot's response
        const noAnalysisMessage: Message = {
          type: 'bot',
          content: detectedLanguage === 'tr' 
            ? "Analiz etmemi istediğiniz bir coin belirtin. Örneğin: 'BTC analiz' veya 'ETH fiyat tahmini'"
            : "Please specify a coin you'd like me to analyze. For example: 'BTC analysis' or 'ETH price prediction'",
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage, noAnalysisMessage]);
        setIsMessageLoading(false);
        return;
      }

      // Extract coin symbol if no coin is selected
      const coinSymbol = selectedCoin ? selectedCoin.symbol : extractCoinSymbol(userInput);
      
      if (!selectedCoin && !coinSymbol) {
        // Add user's message first
        const userMessage: Message = {
          type: 'user',
          content: userInput,
          timestamp: Date.now()
        };

        // Add bot's response
        const noCoinMessage: Message = {
          type: 'bot',
          content: detectedLanguage === 'tr'
            ? "Mesajınızda geçerli bir coin sembolü bulamadım. Lütfen analiz etmek istediğiniz coini belirtin."
            : "I couldn't find a valid coin symbol in your message. Please specify which coin you'd like me to analyze.",
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage, noCoinMessage]);
        setIsMessageLoading(false);
        return;
      }

      // Get previous conversation context
      const conversationHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add user message with timestamp and coin info
      const newUserMessage: Message = { 
        type: 'user', 
        content: userInput,
        timestamp: Date.now(),
        coin: selectedCoin || undefined
      };
      setMessages(prev => [...prev, newUserMessage]);

      // Get TradingView symbol for chart
      const formattedSymbol = coinSymbol ? await getFormattedSymbol(coinSymbol) : '';
      
      // Only show chart if it's a valid TradingView symbol
      if (formattedSymbol && !formattedSymbol.includes('INVALID')) {
        const newBotMessage: Message = {
          type: 'bot',
          content: '',
          chart: {
            symbol: formattedSymbol
          },
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, newBotMessage]);
      }

      // Get chart data
      const chartData = coinSymbol ? await getChartData(coinSymbol) : null;
      if (!chartData) {
        const errorMessage = detectedLanguage === 'tr' ? 
          `${coinSymbol || ''} için veri alınamadı. Bu coin henüz CoinGecko'da listelenmemiş olabilir veya yeterli veri bulunmuyor. Lütfen başka bir coin deneyin.` :
          `Couldn't get data for ${coinSymbol || ''}. This coin might not be listed on CoinGecko yet or there isn't enough data. Please try another coin.`;

        const errorBotMessage: Message = {
          type: 'bot',
          content: errorMessage,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorBotMessage]);
        setIsMessageLoading(false);
        return;
      }

      // Analyze the user's input to determine the type of analysis needed
      const analysisType = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: detectedLanguage === 'tr' ? 
              `Sen bir kripto analisti asistanısın. Kullanıcının sorusunu analiz et ve hangi tür analiz istediğini belirle.
              
              Soru tipleri:
              1. Genel Analiz: "analiz et", "nasıl", "ne düşünüyorsun" gibi genel sorular
              2. Fiyat Tahmini: "hedef", "ne kadar olur", "yükselir mi" gibi fiyat odaklı sorular
              3. Teknik Analiz: "teknik", "göstergeler", "indikatör" gibi teknik analiz odaklı sorular
              4. Piyasa Analizi: "piyasa", "market", "trend" gibi genel piyasa durumu odaklı sorular
              
              Sadece aşağıdaki formatlardan birini döndür:
              - GENEL_ANALIZ
              - FIYAT_TAHMINI
              - TEKNIK_ANALIZ
              - PIYASA_ANALIZI` :
              `You are a crypto analyst assistant. Analyze the user's question and determine what type of analysis is needed.
              
              Question types:
              1. General Analysis: general questions like "analyze", "how is", "what do you think"
              2. Price Prediction: price-focused questions like "target", "how much", "will it rise"
              3. Technical Analysis: technical analysis focused questions like "technical", "indicators"
              4. Market Analysis: market condition focused questions like "market", "trend"
              
              Return only one of the following formats:
              - GENERAL_ANALYSIS
              - PRICE_PREDICTION
              - TECHNICAL_ANALYSIS
              - MARKET_ANALYSIS`
          },
          {
            role: "user",
            content: userInput
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const analysisTypeResult = analysisType.choices[0]?.message?.content?.trim() || "GENERAL_ANALYSIS";

      // Send the analysis
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: detectedLanguage === 'tr' ? 
              `Sen MOAI'sin - kripto piyasalarının en zeki teknik analisti. Analizini TAM OLARAK 3 PARAGRAFTA yap:

              1. PARAGRAF: Fiyat hareketleri ve önemli destek/direnç seviyeleri analizi. Hacim profiline göre belirlenen en önemli destek ve direnç seviyelerini detaylı açıkla. Hangi seviyelerin güçlü olduğunu ve neden önemli olduklarını belirt. Fiyatın bu seviyelere göre konumunu değerlendir.

              2. PARAGRAF: Teknik göstergeleri analiz et (RSI, MACD, BB, SMA'lar). Trend analizi yap ve hacim analizini değerlendir. Farklı periyotlardaki (20, 50, 200) hareketli ortalamaların konumlarını ve ne anlama geldiklerini açıkla.

              3. PARAGRAF: Kullanıcının spesifik sorusunu cevapla. Eğer fiyat tahmini isteniyorsa, destek/direnç seviyeleri ve teknik göstergelere dayalı tahmin yap. Kısa ve orta vadeli hedefleri belirt.

              ÖNEMLİ KURALLAR:
              - Kesinlikle 3 paragraftan fazla yazma
              - Her paragraf en fazla 4-5 cümle olsun
              - Tüm sayısal değerleri **kalın** yaz
              - Teknik terimleri doğal bir dilde açıkla
              - Başlık veya liste kullanma, düz metin yaz
              - Destek/direnç seviyelerini mutlaka belirt

              Not: Bu analiz eğitim amaçlıdır.` :
              `You are MOAI - the smartest technical analyst in crypto markets. Present your analysis in EXACTLY 3 PARAGRAPHS:

              1ST PARAGRAPH: Price action and critical support/resistance levels analysis. Explain in detail the most important support and resistance levels determined by volume profile. Indicate which levels are strong and why they are important. Evaluate price position relative to these levels.

              2ND PARAGRAPH: Analyze technical indicators (RSI, MACD, BB, SMAs). Perform trend analysis and evaluate volume analysis. Explain the positions of different period moving averages (20, 50, 200) and what they mean.

              3RD PARAGRAPH: Answer the user's specific question. If price prediction is requested, make a forecast based on support/resistance levels and technical indicators. Specify short and medium-term targets.

              IMPORTANT RULES:
              - Never write more than 3 paragraphs
              - Each paragraph should be 4-5 sentences maximum
              - Write all numerical values in **bold**
              - Explain technical terms conversationally
              - No headers or lists, just plain text
              - Always mention support/resistance levels

              Note: This analysis is for educational purposes only.`
          },
          ...conversationHistory,
          {
            role: 'user',
            content: `Analyze ${coinSymbol} with the following data: ${JSON.stringify(chartData)}
            User's specific question: ${userInput || 'general analysis'}`
          }
        ],
        model: "gpt-4-turbo-preview",
      });

      const botResponse = completion.choices[0]?.message?.content || 
        (detectedLanguage === 'tr' ? "Üzgünüm, analiz yaparken bir hata oluştu." : "Sorry, an error occurred during analysis.");

      const analysisMessage: Message = {
        type: 'bot',
        content: botResponse,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        type: 'bot',
        content: userLanguage === 'tr' ?
          'Bir hata oluştu. Lütfen tekrar deneyin.' :
          'An error occurred. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsMessageLoading(false);
      setSelectedCoin(null);
    }
  };

  // Render loading state
  if (isWalletLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-purple-300 mt-4">Checking wallet...</p>
      </div>
    );
  }

  // Render connect wallet state
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white mb-8">Welcome to Analyst MOAI</h1>
          <p className="text-purple-300 mb-8">Please connect your wallet to access the analysis</p>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
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
          <p className="text-purple-300 mb-2">You need to hold at least 200,000 MOAI tokens to access this feature</p>
          <p className="text-purple-400/80 text-sm mb-8">Current holdings are insufficient</p>
          <div className="flex flex-col gap-3">
            <a 
              href="YOUR_TOKEN_PURCHASE_LINK" //raydium link ekle
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors"
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

  // Render main chat interface
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Fullscreen Chart Overlay */}
      {fullscreenChart && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={() => setFullscreenChart(null)}
              className="bg-gray-800/50 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <TradingViewWidget
            symbol={fullscreenChart.symbol}
            interval={fullscreenChart.interval}
            isFullscreen={true}
          />
        </div>
      )}

      {/* Header */}
      <header className="w-full p-6 bg-black/30 backdrop-blur-sm border-b border-purple-900/30">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <a href="/" className="text-white hover:text-purple-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </a>
            <div className="relative w-12 h-12 ring-2 ring-purple-500/50 rounded-full overflow-hidden shadow-lg shadow-purple-500/20">
              <Image
                src="/moai.webp"
                alt="MOAI"
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Analyst MOAI</h1>
              <p className="text-sm text-purple-300/80">Crypto Market Analyst</p>
            </div>
          </div>
          
          {/* Wallet Connection Controls */}
          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <div className="text-right">
                  <p className="text-sm text-purple-300/80">Connected Wallet</p>
                  <p className="text-xs text-purple-400/60 truncate max-w-[150px]">
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
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
            )}
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full custom-scrollbar [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-purple-600/50 hover:[&::-webkit-scrollbar-thumb]:bg-purple-500 [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`${message.content === '' && message.chart ? 'w-[80%]' : 'max-w-[80%]'} p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-500/20'
                  : 'bg-gray-800/80 text-white rounded-bl-none shadow-lg shadow-black/20 backdrop-blur-sm'
              }`}
            >
              {message.type === 'user' ? (
                <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                  {message.coin ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-purple-900/60 px-2 py-0.5 rounded-lg text-purple-200">
                        <img src={message.coin.thumb} alt={message.coin.symbol} className="w-4 h-4 rounded-full" />
                        {message.coin.symbol}
                      </span>
                      <span>{message.content}</span>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              ) : (
                <>
                  {message.chart && (
                    <div className="relative">
                      <button
                        onClick={() => message.chart && setFullscreenChart(message.chart)}
                        className="absolute top-4 right-4 z-10 bg-gray-800/50 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L15 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 15" />
                        </svg>
                      </button>
                      <TradingViewWidget 
                        symbol={message.chart.symbol} 
                        interval={message.chart.interval} 
                        onChartReady={setChartWidget}
                      />
                    </div>
                  )}
                  <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        strong: ({node, ...props}) => <span className="font-bold text-purple-300" {...props} />,
                        p: ({node, children, ...props}) => {
                          if (typeof children === 'string' && message.coin?.symbol) {
                            const parts = children.split(message.coin.symbol);
                            const coin = message.coin;
                            return (
                              <p {...props}>
                                {parts.map((part, i, arr) => (
                                  <React.Fragment key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                      <span className="inline-flex items-center gap-1 bg-purple-900/60 px-2 py-0.5 rounded-lg text-purple-200">
                                        <img src={coin.thumb} alt={coin.symbol} className="w-4 h-4 rounded-full" />
                                        {coin.symbol}
                                      </span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </p>
                            );
                          }
                          return <p {...props}>{children}</p>;
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {isMessageLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/80 text-white rounded-2xl rounded-bl-none p-4 max-w-[80%] animate-pulse shadow-lg shadow-black/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions Area */}
      <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-4xl bottom-24" ref={suggestionsRef}>
        {suggestions.length > 0 && !isMessageLoading && showSuggestions && (
          <div className="flex justify-center gap-3 flex-wrap transition-opacity duration-1000">
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
                <img src={suggestion.thumb} alt={suggestion.name} className="w-5 h-5 rounded-full" />
                <span>{suggestion.symbol}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-purple-900/30 bg-black/30 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmitWithCoin} className="flex gap-2">
            <div className="flex-1 bg-gray-800/80 rounded-xl px-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-purple-500/50">
              {selectedCoin && (
                <div className="flex items-center gap-2 bg-purple-500/20 px-2 py-1 rounded-lg m-1">
                  <img src={selectedCoin.thumb} alt={selectedCoin.name} className="w-5 h-5 rounded-full" />
                  <span className="text-purple-300">{selectedCoin.symbol}</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-purple-400 hover:text-purple-300 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={selectedCoin ? 
                  (userLanguage === 'tr' ? 'Sormak istediğiniz soruyu yazın...' : 'Type your question...') :
                  (userLanguage === 'tr' ? 'Analiz etmek istediğiniz coini yazın...' : 'Type a coin to analyze...')
                }
                disabled={isMessageLoading}
                className="flex-1 bg-transparent text-white px-2 py-3 focus:outline-none disabled:opacity-50 placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              disabled={isMessageLoading}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 font-medium"
            >
              {isMessageLoading ? 'Analyzing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}