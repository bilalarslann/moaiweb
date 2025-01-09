'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import { debounce } from 'lodash';

type Message = {
  type: 'user' | 'bot';
  content: string;
  chart?: {
    symbol: string;
    interval?: string;
  };
};

interface CoinAlternative {
  symbol: string;
  exchange: string;
}

interface SearchResult {
  symbol: string;
  description: string;
  image: string;
  market_cap_rank: number;
  type: "crypto";
  id: string;
  price_usd: number;
  price_change_24h: number | null;
  volume_24h: number | null;
}

interface SearchResultWithNullablePrice extends Omit<SearchResult, 'price_usd'> {
  price_usd: number | null;
}

// Type guard function
function isValidSearchResult(result: SearchResultWithNullablePrice | null): result is SearchResult {
  return result !== null && typeof result.price_usd === 'number';
}

interface CoinGeckoPriceData {
  [key: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
  };
}

interface CoinGeckoSearchResult {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
}

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
    // Önbellekte varsa ve tazeyse, önbellekten döndür
    const cacheKey = query.toLowerCase();
    const now = Date.now();
    if (symbolCache.has(cacheKey) && (now - lastCacheTime) < CACHE_DURATION) {
      return symbolCache.get(cacheKey)!;
    }

    // TradingView sembol arama API'sini kullan
    const response = await fetch(`https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}&type=crypto`);
    const data = await response.json();

    if (data && data.length > 0) {
      // Kripto para eşleşmelerini filtrele
      const cryptoMatches = data.filter((item: any) => 
        item.type === "crypto" && 
        (item.symbol.toLowerCase().includes(query.toLowerCase()) ||
         item.description.toLowerCase().includes(query.toLowerCase()))
      );

      if (cryptoMatches.length > 0) {
        // İşlem hacmine göre sırala (eğer varsa)
        cryptoMatches.sort((a: any, b: any) => {
          const volumeA = a.volume || 0;
          const volumeB = b.volume || 0;
          return volumeB - volumeA;
        });

        // En iyi eşleşmeyi seç
        const bestMatch = cryptoMatches[0];
        const symbol = bestMatch.symbol;
        
        // Sembolü önbelleğe al
        symbolCache.set(cacheKey, symbol);
        lastCacheTime = now;
        console.log(`Found TradingView symbol for "${query}":`, symbol);
        return symbol;
      }
    }

    // Eşleşme bulunamazsa orijinal girdiyi döndür
    console.log(`No TradingView symbol found for "${query}", using as is`);
    return query.toUpperCase();
  } catch (error) {
    console.error('Error searching TradingView symbol:', error);
    return query.toUpperCase();
  }
};

// Coin sembolünü doğru exchange ile birleştiren yardımcı fonksiyon
const getFormattedSymbol = async (symbol: string): Promise<string> => {
  try {
    // Önce varsayılan formatı hazırla
    const defaultSymbol = `${symbol.toUpperCase()}USDT`;

    // TradingView'den doğru sembolü al (proxy üzerinden)
    const response = await fetch(`/api/crypto?url=${encodeURIComponent(`https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(symbol)}&type=crypto`)}`);
    
    if (!response.ok) {
      return defaultSymbol;
    }

    try {
      const data = await response.json();

      if (data && data.length > 0) {
        // Kripto para eşleşmelerini filtrele
        const cryptoMatches = data.filter((item: any) => 
          item.type === "crypto" && 
          (item.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
           item.description.toLowerCase().includes(symbol.toLowerCase()))
        );

        if (cryptoMatches.length > 0) {
          // İşlem hacmine göre sırala (eğer varsa)
          cryptoMatches.sort((a: any, b: any) => {
            const volumeA = a.volume || 0;
            const volumeB = b.volume || 0;
            return volumeB - volumeA;
          });

          // En iyi eşleşmeyi seç
          const bestMatch = cryptoMatches[0];
          
          // Eğer exchange_listed varsa ve BINANCE, KUCOIN, MEXC, GATE, OKX, HUOBI, BITGET veya GEMINI ise, kullan
          if (bestMatch.exchange_listed) {
            const exchange = bestMatch.exchange_listed.toUpperCase();
            const pair = bestMatch.symbol.split(':')[1] || bestMatch.symbol;
            return `${exchange}:${pair}`;
          }
          
          // Yoksa sembolü direkt kullan
          return bestMatch.symbol;
        }
      }
    } catch (e) {
      // JSON parse hatası durumunda varsayılan sembolü kullan
      return defaultSymbol;
    }

    // Eşleşme bulunamazsa varsayılan sembolü döndür
    return defaultSymbol;
  } catch (error) {
    // Hata durumunda varsayılan sembolü döndür
    return `${symbol.toUpperCase()}USDT`;
  }
};

// TradingView types
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
  }
}

interface TradingViewConfig {
  width: string;
  height: number;
  symbol: string;
  interval: string;
  timezone: string;
  theme: string;
  style: string;
  locale: string;
  toolbar_bg: string;
  enable_publishing: boolean;
  hide_side_toolbar: boolean;
  allow_symbol_change: boolean;
  hide_top_toolbar: boolean;
  save_image: boolean;
  container_id: string;
  library_path: string;
  auto_save_delay: number;
  debug: boolean;
  disabled_features: string[];
  enabled_features: string[];
  studies: string[];
  studies_overrides: Record<string, any>;
  drawings_access: {
    type: string;
    tools: { name: string; grayed: boolean; }[];
  };
  overrides: Record<string, any>;
  loading_screen: { backgroundColor: string };
  time_frames: { text: string; resolution: string; description: string; }[];
  datafeed?: {
    onReady: (callback: (config: any) => void) => void;
    searchSymbols: (userInput: string, exchange: string, symbolType: string, onResult: (result: any[]) => void) => void;
    resolveSymbol: (symbolName: string, onSymbolResolvedCallback: (symbol: any) => void, onResolveErrorCallback: (reason: string) => void) => void;
    getBars: (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void, onErrorCallback: (reason: string) => void, firstDataRequest: boolean) => void;
    subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: (bar: any) => void, subscriberUID: string, onResetCacheNeededCallback: () => void) => void;
    unsubscribeBars: (subscriberUID: string) => void;
  };
}

interface ChartData {
  price: number | null;
  rsi: number | null;
  sma: number | null;
  bb: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
  supports: number[];
  resistances: number[];
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

// TradingView Widget Component
const TradingViewWidget = ({ symbol, interval = '1D', onChartReady, isFullscreen }: { 
  symbol: string, 
  interval?: string, 
  onChartReady?: (widget: any) => void,
  isFullscreen?: boolean 
}) => {
  const widgetRef = useRef<any>(null);
  const containerId = useRef(`tradingview_${symbol}_${Math.random().toString(36).substring(7)}`);

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
          const widgetOptions: TradingViewConfig = {
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
            ],
            studies: [
              "MASimple@tv-basicstudies",
              "RSI@tv-basicstudies",
              "BB@tv-basicstudies",
              "PivotPointsHighLow@tv-basicstudies",
              "Support@tv-basicstudies",
              "Resistance@tv-basicstudies",
              "ZigZag@tv-basicstudies",
              "PivotPointsStandard@tv-basicstudies"
            ],
            studies_overrides: {
              "pivotPointsHighLow.showLabels": true,
              "pivotPointsHighLow.levelLines.level1.color": "#2962ff",
              "pivotPointsHighLow.levelLines.level2.color": "#f44336",
              "pivotPointsHighLow.levelLines.level3.color": "#009688",
              "Support.linecolor": "#2962ff",
              "Support.linewidth": 2,
              "Resistance.linecolor": "#f44336",
              "Resistance.linewidth": 2,
              "PivotPointsStandard.color.support.1": "#2962ff",
              "PivotPointsStandard.color.support.2": "#009688",
              "PivotPointsStandard.color.resistance.1": "#f44336",
              "PivotPointsStandard.color.resistance.2": "#ff9800",
              "ZigZag.deviation": 5
            },
            drawings_access: { 
              type: "all",
              tools: [
                { name: "Support", grayed: false },
                { name: "Resistance", grayed: false },
                { name: "TrendLine", grayed: false }
              ]
            },
            overrides: {
              "mainSeriesProperties.showPriceLine": true,
              "paneProperties.background": "#131722",
              "paneProperties.vertGridProperties.color": "#363c4e",
              "paneProperties.horzGridProperties.color": "#363c4e",
              "symbolWatermarkProperties.transparency": 90,
              "scalesProperties.textColor": "#AAA",
              "mainSeriesProperties.candleStyle.wickUpColor": '#26a69a',
              "mainSeriesProperties.candleStyle.wickDownColor": '#ef5350',
              "paneProperties.topMargin": 5,
              "paneProperties.bottomMargin": 5
            },
            loading_screen: { backgroundColor: "#131722" },
            time_frames: [
              { text: "1D", resolution: "D", description: "1 Day" },
              { text: "4H", resolution: "240", description: "4 Hours" },
              { text: "1H", resolution: "60", description: "1 Hour" },
              { text: "30m", resolution: "30", description: "30 Minutes" },
              { text: "15m", resolution: "15", description: "15 Minutes" },
              { text: "5m", resolution: "5", description: "5 Minutes" }
            ],
            // Temel sembol bilgilerini sağla
            datafeed: {
              onReady: (callback: any) => {
                callback({
                  supported_resolutions: ["1", "5", "15", "30", "60", "240", "D", "W", "M"],
                  supports_marks: false,
                  supports_timescale_marks: false,
                  supports_time: true,
                  exchanges: [
                    { value: "", name: "All Exchanges", desc: "" },
                    { value: "BINANCE", name: "Binance", desc: "Binance" },
                    { value: "KUCOIN", name: "KuCoin", desc: "KuCoin" }
                  ],
                  symbols_types: [{ name: "crypto", value: "crypto" }]
                });
              },
              searchSymbols: () => {},
              resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any) => {
                onSymbolResolvedCallback({
                  name: symbolName,
                  full_name: symbolName,
                  description: symbolName,
                  type: "crypto",
                  session: "24x7",
                  timezone: "Etc/UTC",
                  minmov: 1,
                  pricescale: 100000000,
                  has_intraday: true,
                  has_daily: true,
                  has_weekly_and_monthly: true,
                  supported_resolutions: ["1", "5", "15", "30", "60", "240", "D", "W", "M"],
                  volume_precision: 8,
                  data_status: "streaming",
                });
              },
              getBars: (symbolInfo: any, resolution: string, periodParams: any, onHistoryCallback: any, onErrorCallback: any) => {
                onHistoryCallback([], { noData: true });
              },
              subscribeBars: () => {},
              unsubscribeBars: () => {}
            }
          };

          if (onChartReady) {
            widgetOptions.datafeed = {
              onReady: (callback: any) => {
                console.log('Chart is ready');
                callback({});
                onChartReady(widget);
              }
            };
          }

          widget = new window.TradingView.widget(widgetOptions);
          widgetRef.current = widget;
        } catch (error) {
          console.error('Widget initialization error:', error);
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

// Function to get chart data
const getChartData = async (symbol: string): Promise<ChartData | null> => {
  try {
    const chartData: ChartData = {
      price: null,
      rsi: null,
      sma: null,
      bb: {
        upper: null,
        middle: null,
        lower: null
      },
      supports: [],
      resistances: []
    };

    // Sembolü temizle (BINANCE:BTCUSDT -> BTC)
    const cleanSymbol = symbol.split(':').pop()?.replace(/USDT$/, '') || symbol;

    // Try to get data from multiple exchanges
    const exchanges = [
      {
        name: 'Binance',
        priceUrl: `https://api.binance.com/api/v3/ticker/price?symbol=${cleanSymbol}USDT`,
        klinesUrl: `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}USDT&interval=1d&limit=30`,
        parsePrice: (data: any) => parseFloat(data.price),
        parseKlines: (data: any) => data.map((k: any) => parseFloat(k[4]))
      },
      {
        name: 'KuCoin',
        priceUrl: `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${cleanSymbol}-USDT`,
        klinesUrl: `https://api.kucoin.com/api/v1/market/candles?symbol=${cleanSymbol}-USDT&type=1day&limit=30`,
        parsePrice: (data: any) => parseFloat(data.data.price),
        parseKlines: (data: any) => data.data.reverse().map((k: any) => parseFloat(k[2]))
      }
    ];

    // Try each exchange until we get valid data
    for (const exchange of exchanges) {
      try {
        // Her borsa için tek tek dene
        const priceResponse = await fetch(`/api/crypto?url=${encodeURIComponent(exchange.priceUrl)}`);
        if (!priceResponse.ok) continue;

        let priceData;
        try {
          priceData = await priceResponse.json();
        } catch (e) {
          continue;
        }

        // Set current price
        try {
          const price = exchange.parsePrice(priceData);
          if (!price || isNaN(price)) continue;
          chartData.price = price;

          // Fiyat başarılı ise şimdi klines verisini al
          const klinesResponse = await fetch(`/api/crypto?url=${encodeURIComponent(exchange.klinesUrl)}`);
          if (!klinesResponse.ok) continue;

          let klinesData;
          try {
            klinesData = await klinesResponse.json();
          } catch (e) {
            continue;
          }

          // Get klines data
          try {
            const closes = exchange.parseKlines(klinesData);
            if (!closes || closes.length < 20 || closes.some(isNaN)) continue;

            // Calculate SMA (20 periods)
            const sma = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
            chartData.sma = sma;

            // Calculate RSI (14 periods)
            const gains = [];
            const losses = [];
            for (let i = 1; i < closes.length; i++) {
              const diff = closes[i] - closes[i - 1];
              if (diff >= 0) {
                gains.push(diff);
                losses.push(0);
              } else {
                gains.push(0);
                losses.push(Math.abs(diff));
              }
            }
            const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
            const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
            const rs = avgGain / avgLoss;
            chartData.rsi = 100 - (100 / (1 + rs));

            // Calculate Bollinger Bands (20 periods, 2 standard deviations)
            const last20Closes = closes.slice(-20);
            const bbSMA = last20Closes.reduce((a: number, b: number) => a + b, 0) / 20;
            const squaredDiffs = last20Closes.map((close: number) => Math.pow(close - bbSMA, 2));
            const stdDev = Math.sqrt(squaredDiffs.reduce((a: number, b: number) => a + b, 0) / 20);
            
            chartData.bb.middle = bbSMA;
            chartData.bb.upper = bbSMA + (2 * stdDev);
            chartData.bb.lower = bbSMA - (2 * stdDev);

            // Calculate support and resistance levels
            const sortedPrices = [...closes].sort((a, b) => a - b);
            const currentPrice = chartData.price || 0;
            
            // Find closest support levels below current price
            chartData.supports = sortedPrices
              .filter(price => price < currentPrice)
              .slice(-3)
              .reverse();

            // Find closest resistance levels above current price
            chartData.resistances = sortedPrices
              .filter(price => price > currentPrice)
              .slice(0, 3);

            return chartData;
          } catch (e) {
            continue;
          }
        } catch (e) {
          continue;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

export default function AnalistMoai() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: `Hello! I'm ANALYST MOAI 🗿\n\nI can analyze cryptocurrency markets. You can consult me for technical analysis, price predictions, and market insights.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [chartWidget, setChartWidget] = useState<any>(null);
  const [fullscreenChart, setFullscreenChart] = useState<{symbol: string, interval?: string} | null>(null);
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>('en');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [userLanguage]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 1) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        // CoinGecko API'sini kullan
        const searchResponse = await fetch(`/api/crypto?url=${encodeURIComponent(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`)}`);
        
        if (!searchResponse.ok) {
          throw new Error('Search API error');
        }

        const searchData = await searchResponse.json();
        
        // Sadece kripto paraları filtrele
        const filteredCoins = (searchData.coins as CoinGeckoSearchResult[])
          .filter(coin => coin.market_cap_rank && coin.id) // Sadece market cap'i ve ID'si olan coinleri al
          .slice(0, 6); // İlk 6 sonucu al

        if (filteredCoins.length === 0) {
          setSearchResults([]);
          setShowSearchResults(false);
          return;
        }

        // Fiyat bilgilerini almak için tek bir API çağrısı yap
        const validCoinIds = filteredCoins
          .map(coin => coin.id)
          .filter(id => id && typeof id === 'string' && id.length > 0);

        if (validCoinIds.length === 0) {
          setSearchResults([]);
          setShowSearchResults(false);
          return;
        }

        const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${validCoinIds.join(',')}&vs_currency=usd&include_24hr_vol=true&include_24hr_change=true&precision=2`;
        const priceResponse = await fetch(`/api/crypto?url=${encodeURIComponent(priceUrl)}`);
        
        let priceData: CoinGeckoPriceData = {};
        if (priceResponse.ok) {
          try {
            const rawPriceData = await priceResponse.json();
            // Validate price data
            if (rawPriceData && typeof rawPriceData === 'object') {
              priceData = Object.entries(rawPriceData).reduce((acc, [key, value]) => {
                if (value && typeof value === 'object' && 'usd' in value) {
                  acc[key] = value as { usd: number; usd_24h_change?: number; usd_24h_vol?: number };
                }
                return acc;
              }, {} as CoinGeckoPriceData);
            }
          } catch (e) {
            console.log('Price data parse error');
          }
        }

        // Sonuçları formatla
        const formattedResults = filteredCoins
          .map(coin => {
            const price = priceData[coin.id];
            if (!price || typeof price.usd !== 'number') return null;

            const result: SearchResultWithNullablePrice = {
              symbol: coin.symbol.toUpperCase(),
              description: coin.name,
              image: coin.large || coin.thumb,
              market_cap_rank: coin.market_cap_rank,
              type: "crypto" as const,
              id: coin.id,
              price_usd: price.usd,
              price_change_24h: typeof price.usd_24h_change === 'number' ? price.usd_24h_change : null,
              volume_24h: typeof price.usd_24h_vol === 'number' ? price.usd_24h_vol : null
            };

            return result;
          })
          .filter(isValidSearchResult);

        setSearchResults(formattedResults);
        setShowSearchResults(formattedResults.length > 0);
      } catch (error) {
        // Hata durumunda sessizce devam et
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 1000), // Debounce süresini 1 saniyeye çıkar
    []
  );

  // Handle input change with minimum length check
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toLowerCase(); // Küçük harfe çevir
    setInput(value);
    
    // En az 3 karakter yazıldığında aramaya başla
    if (value.length >= 3) {
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle search result click
  const handleSearchResultClick = async (symbol: string) => {
    setInput('');
    setSearchResults([]);
    setShowSearchResults(false);
    setIsLoading(true);
    
    // Add user message with the selected symbol
    setMessages(prev => [...prev, { 
      type: 'user', 
      content: userLanguage === 'tr' ? 
        `${symbol} için analiz yapar mısın?` : 
        `Can you analyze ${symbol}?` 
    }]);

    try {
      // Get formatted symbol with correct exchange
      const formattedSymbol = await getFormattedSymbol(symbol);
      
      // First, send just the chart
      setMessages(prev => [...prev, {
        type: 'bot',
        content: '',
        chart: {
          symbol: formattedSymbol
        }
      }]);

      // Get chart data and continue with analysis
      const chartData = await getChartData(symbol);
      if (!chartData) {
        throw new Error('Could not get chart data');
      }

      // Generate analysis using OpenAI
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: userLanguage === 'tr' ? 
              `Sen ANALIST MOAI'sin, bir yapay zeka kripto analisti. Verilen coin için teknik analiz yap.` :
              `You are ANALYST MOAI, an AI cryptocurrency analyst. Provide technical analysis for the given coin.`
          },
          {
            role: "user",
            content: userLanguage === 'tr' ? 
              `${symbol} için detaylı teknik analiz yap.` :
              `Provide a detailed technical analysis for ${symbol}.`
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const botResponse = completion.choices[0]?.message?.content || 
        (userLanguage === 'tr' ? "Üzgünüm, analiz yaparken bir hata oluştu." : "Sorry, an error occurred during analysis.");

      setMessages(prev => [...prev, {
        type: 'bot',
        content: botResponse
      }]);
    } catch (error) {
      console.log('Analysis error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: userLanguage === 'tr' ?
          'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' :
          'Sorry, an error occurred. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Add user message
      setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

      // Detect language
      const languageCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a language detector. Respond with 'tr' for Turkish text and 'en' for English text."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
        max_tokens: 1
      });

      const detectedLanguage = languageCompletion.choices[0]?.message?.content?.toLowerCase() || 'en';
      setUserLanguage(detectedLanguage as 'en' | 'tr');

      // Extract symbol from message
      const symbolCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: detectedLanguage === 'tr' ?
              `Verilen mesajdan kripto para sembolünü ve grafik gösterme isteğini çıkar. Cevabı JSON formatında döndür.
              Örnek: { "symbol": "BTC", "showChart": true, "onlyChart": true/false }
              
              Eğer mesaj şu durumlardan birini içeriyorsa, showChart true olmalı:
              - Grafik gösterme isteği
              - Teknik analiz isteği
              - Destek/direnç analizi isteği
              - Fiyat analizi isteği
              - Trend analizi isteği
              - Sadece coin ismi/sembolü (örn: "BTC" veya "Bitcoin" veya "GOAT")
              
              Eğer mesaj sadece grafiği göstermeyi istiyorsa veya sadece coin ismi/sembolü ise, onlyChart false olmalı.
              
              Örnek mesajlar ve cevapları:
              "Bitcoin grafiğini göster" -> { "symbol": "BTC", "showChart": true, "onlyChart": true }
              "Sadece BTC grafik" -> { "symbol": "BTC", "showChart": true, "onlyChart": true }
              "BTC nasıl?" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
              "Ethereum analiz et" -> { "symbol": "ETH", "showChart": true, "onlyChart": false }
              "Bitcoin'in destek ve direnç seviyeleri nedir?" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
              "GOAT" -> { "symbol": "GOAT", "showChart": true, "onlyChart": false }
              "BTC" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
              "Kripto paralar hakkında konuşalım" -> { "symbol": null, "showChart": false, "onlyChart": false }
              "Merhaba" -> { "symbol": null, "showChart": false, "onlyChart": false }` :
              `Extract the cryptocurrency symbol and chart display request from the given message. Return the answer in JSON format.
              Example: { "symbol": "BTC", "showChart": true, "onlyChart": true/false }
              
              If the message contains any of these cases, showChart should be true:
              - Chart display request
              - Technical analysis request
              - Support/resistance analysis request
              - Price analysis request
              - Trend analysis request
              - Just coin name/symbol (e.g., "BTC" or "Bitcoin" or "GOAT")
              
              If the message only requests to show the chart or is just a coin name/symbol, onlyChart should be false.
              
              Example messages and responses:
              "Show Bitcoin chart" -> { "symbol": "BTC", "showChart": true, "onlyChart": true }
              "Just BTC chart" -> { "symbol": "BTC", "showChart": true, "onlyChart": true }
              "How's BTC?" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
              "Analyze Ethereum" -> { "symbol": "ETH", "showChart": true, "onlyChart": false }
              "What are Bitcoin's support and resistance levels?" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
              "GOAT" -> { "symbol": "GOAT", "showChart": true, "onlyChart": false }
              "BTC" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
              "Let's talk about cryptocurrencies" -> { "symbol": null, "showChart": false, "onlyChart": false }
              "Hello" -> { "symbol": null, "showChart": false, "onlyChart": false }`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(symbolCompletion.choices[0]?.message?.content || "{}") as {
        symbol: string | null;
        showChart: boolean;
        onlyChart: boolean;
      };
      
      const symbol = response.symbol;
      const showChart = response.showChart;
      const onlyChart = response.onlyChart;

      if (showChart && symbol) {
        // Get formatted symbol with correct exchange
        const formattedSymbol = await getFormattedSymbol(symbol);
        
        // First, send just the chart
        setMessages(prev => [...prev, {
          type: 'bot',
          content: '',
          chart: {
            symbol: formattedSymbol
          }
        }]);

        if (!onlyChart) {
          // Wait for chart to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Get chart data using Binance API
          const chartData = await getChartData(symbol);

          if (!chartData) {
            throw new Error('Could not get chart data');
          }

          // Then send the analysis
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: detectedLanguage === 'tr' ? 
                  `Sen ANALIST MOAI'sin, bir yapay zeka kripto analisti.
                  Aşağıdaki gerçek zamanlı verileri kullanarak mevcut grafiği analiz et:

                  Mevcut Veriler:
                  - Fiyat: **${chartData.price}**
                  - RSI: **${chartData.rsi?.toFixed(2)}**
                  - SMA: **${chartData.sma?.toFixed(2)}**
                  - Bollinger Bantları:
                    * Üst: **${chartData.bb.upper?.toFixed(2)}**
                    * Orta: **${chartData.bb.middle?.toFixed(2)}**
                    * Alt: **${chartData.bb.lower?.toFixed(2)}**
                  - Destek Seviyeleri: **${chartData.supports.map(s => s.toFixed(2)).join('**, **')}**
                  - Direnç Seviyeleri: **${chartData.resistances.map(r => r.toFixed(2)).join('**, **')}**

                  Detaylı bir teknik analiz sun. Her bölüm için yeni paragraf kullan.
                  Analiz şu bölümleri içermeli (her biri yeni paragrafla başlamalı):

                  1. MEVCUT DURUM VE TREND ANALİZİ
                  - Mevcut fiyat seviyesi
                  - SMA'ya göre trend durumu (üstünde veya altında)
                  - Genel trend yönü

                  2. RSI ANALİZİ
                  - RSI değeri ve anlamı
                  - Aşırı alım/satım durumları
                  - Momentum değerlendirmesi

                  3. BOLLINGER BANT ANALİZİ
                  - Fiyatın bantlara göre konumu
                  - Volatilite durumu
                  - Olası sıkışma/genişleme

                  4. DESTEK VE DİRENÇ SEVİYELERİ
                  - En yakın destek seviyeleri ve önemi
                  - En yakın direnç seviyeleri ve önemi
                  - Kritik seviyeler

                  5. GENEL DEĞERLENDİRME VE SENARYOLAR
                  - Kısa vadeli beklentiler
                  - Olası senaryolar
                  - Takip edilecek seviyeler

                  Her bölüme "📊", "📈", "💹", "🎯", "💡" gibi uygun emojilerle başla.
                  Önemli sayısal değerleri ve kritik seviyeleri **kalın** yaz.
                  Paragraflar arasında boş satır bırak.
                  Markdown formatını kullan (örnek: **kalın metin**).

                  Son olarak, ayrı bir paragrafta şu notu ekle:

                  ⚠️ Bu analiz sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.` :
                  `You are ANALYST MOAI, an AI cryptocurrency analyst assistant.
                  Analyze the current chart using the following real-time data:

                  Current Data:
                  - Price: **${chartData.price}**
                  - RSI: **${chartData.rsi?.toFixed(2)}**
                  - SMA: **${chartData.sma?.toFixed(2)}**
                  - Bollinger Bands:
                    * Upper: **${chartData.bb.upper?.toFixed(2)}**
                    * Middle: **${chartData.bb.middle?.toFixed(2)}**
                    * Lower: **${chartData.bb.lower?.toFixed(2)}**
                  - Support Levels: **${chartData.supports.map(s => s.toFixed(2)).join('**, **')}**
                  - Resistance Levels: **${chartData.resistances.map(r => r.toFixed(2)).join('**, **')}**

                  Provide a detailed technical analysis. Use new paragraphs for each section.
                  The analysis should include these sections (each starting with a new paragraph):

                  1. CURRENT STATUS AND TREND ANALYSIS
                  - Current price level
                  - Trend status relative to SMA (above or below)
                  - General trend direction

                  2. RSI ANALYSIS
                  - RSI value and its meaning
                  - Overbought/oversold conditions
                  - Momentum assessment

                  3. BOLLINGER BANDS ANALYSIS
                  - Price position relative to bands
                  - Volatility status
                  - Potential squeeze/expansion

                  4. SUPPORT AND RESISTANCE LEVELS
                  - Nearest support levels and their significance
                  - Nearest resistance levels and their significance
                  - Critical levels

                  5. OVERALL ASSESSMENT AND SCENARIOS
                  - Short-term expectations
                  - Possible scenarios
                  - Levels to watch

                  Start each section with appropriate emojis like "📊", "📈", "💹", "🎯", "💡".
                  Use **bold** for important numerical values and critical levels.
                  Leave a blank line between paragraphs.
                  Use markdown format (example: **bold text**).

                  Finally, add this note in a separate paragraph:

                  ⚠️ This analysis is for educational purposes only, not financial advice.`
              },
              {
                role: "user",
                content: detectedLanguage === 'tr' ? 
                  `${symbol} için detaylı teknik analiz yap.` :
                  `Provide a detailed technical analysis for ${symbol}.`
              }
            ],
            model: "gpt-3.5-turbo",
          });

          const botResponse = completion.choices[0]?.message?.content || 
            (detectedLanguage === 'tr' ? "Üzgünüm, analiz yaparken bir hata oluştu." : "Sorry, an error occurred during analysis.");

          setMessages(prev => [...prev, {
            type: 'bot',
            content: botResponse
          }]);
        }
      } else {
        // Handle non-chart messages
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: detectedLanguage === 'tr' ? 
                `Sen ANALIST MOAI'sin, bir yapay zeka kripto analisti. Kripto para piyasaları hakkında bilgi ver ve soruları yanıtla.
                
                Yanıtlarında:
                - Açık ve anlaşılır ol
                - Teknik terimleri açıkla
                - Önemli noktaları vurgula
                - Uygun yerlerde emoji kullan
                
                Son olarak, eğer uygunsa, şu notu ekle:
                ⚠️ Bu bilgiler sadece eğitim amaçlıdır, yatırım tavsiyesi değildir.` :
                `You are ANALYST MOAI, an AI cryptocurrency analyst assistant. Provide information about cryptocurrency markets and answer questions.
                
                In your responses:
                - Be clear and understandable
                - Explain technical terms
                - Emphasize important points
                - Use emojis where appropriate
                
                Finally, if applicable, add this note:
                ⚠️ This information is for educational purposes only, not financial advice.`
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
          content: botResponse
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
    } finally {
      setIsLoading(false);
    }
  };

  // Search Results UI
  const renderSearchResults = () => {
    if (!showSearchResults || searchResults.length === 0) return null;

    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-4xl">
        <div className="flex justify-center gap-2 flex-wrap">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSearchResultClick(result.symbol)}
              className="px-4 py-2 rounded-lg transition-all duration-200 border border-blue-500/50 text-blue-400 hover:text-blue-300 shadow-[0_0_10px_0] shadow-blue-500/20 bg-black/80 backdrop-blur-md hover:shadow-[0_0_15px_0] hover:shadow-blue-500/30 hover:border-blue-400/50 text-sm whitespace-nowrap"
            >
              <div className="flex items-center gap-1.5">
                {/* Logo */}
                <div className="relative flex-shrink-0">
                  <Image 
                    src={result.image} 
                    alt={result.description}
                    width={16}
                    height={16}
                    className="rounded-full"
                    unoptimized
                  />
                </div>
                
                {/* Symbol and Price */}
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{result.symbol.toUpperCase()}</span>
                  {result.price_usd && (
                    <span className="text-gray-400">${result.price_usd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

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
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
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
              <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    strong: ({node, ...props}) => <span className="font-bold text-purple-300" {...props} />
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.chart && (
                <div className="relative">
                  <button
                    onClick={() => message.chart && setFullscreenChart(message.chart)}
                    className="absolute top-4 right-4 z-10 bg-gray-800/50 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0l15-15m-15 0L15 9" />
                    </svg>
                  </button>
                  <TradingViewWidget 
                    symbol={message.chart.symbol} 
                    interval={message.chart.interval} 
                    onChartReady={setChartWidget}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
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

      {/* Search Results */}
      {renderSearchResults()}

      {/* Input Area */}
      <div className="border-t border-purple-900/30 bg-black/30 backdrop-blur-sm p-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            handleSubmit(e);
          }
        }} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => {
                setTimeout(() => setShowSearchResults(false), 200);
              }}
              placeholder={currentPlaceholder}
              className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 font-medium"
            >
              {isLoading ? 'Analyzing...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 