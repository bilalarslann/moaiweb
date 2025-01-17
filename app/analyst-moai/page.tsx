'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AccountLayout } from '@solana/spl-token';
import OpenAI from 'openai';
import { validateCoinSymbol } from '@/utils/validation';

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

// Add new function for OpenAI calls
const callOpenAI = async (messages: any[], model: string = "gpt-3.5-turbo", response_format?: { type: string }) => {
  try {
    const response = await fetch('/api/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-request': 'true'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: response_format
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content || '';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
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

// Coin sembolünü formatlayan yardımcı fonksiyon
const getFormattedSymbol = async (symbol: string): Promise<string> => {
  try {
    const cleanSymbol = symbol.replace(/(USDT|USDC)$/, '').toUpperCase();
    return `${cleanSymbol}USDT`;
  } catch (error) {
    console.debug('Error formatting symbol:', error);
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

// TradingView widget güvenliği
const TradingViewWidget = ({ symbol, interval = '240', onChartReady, isFullscreen }: { 
  symbol: string, 
  interval?: string, 
  onChartReady?: (widget: any) => void,
  isFullscreen?: boolean 
}) => {
  const widgetRef = useRef<any>(null);
  const containerId = useRef(`tradingview_${crypto.randomUUID()}`);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // localStorage kullanımını engelle
  useEffect(() => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      const event = new Event('localStorage');
      document.dispatchEvent(event);
      originalSetItem.call(localStorage, key, value);
    };

    const storageHandler = (e: Event) => {
      const tvStorageKeys = Array.from(Array(localStorage.length), (_, i) => localStorage.key(i))
        .filter((key): key is string => key !== null && key.startsWith('tradingview'));
      
      tvStorageKeys.forEach(key => localStorage.removeItem(key));
    };

    document.addEventListener('localStorage', storageHandler);
    return () => {
      document.removeEventListener('localStorage', storageHandler);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  useEffect(() => {
    let widget: any = null;
    const container = document.getElementById(containerId.current);
    
    if (!container) return;

    // Strict input validation
    if (!validateCoinSymbol(symbol) || !/^\d+$/.test(interval)) {
      console.error('Invalid input parameters');
      container.innerHTML = 'Invalid parameters';
      return;
    }

    const loadWidget = () => {
      try {
        if (typeof window.TradingView === 'undefined') {
          console.error('TradingView not loaded');
          return;
        }

        // Enhanced security configuration
        const safeConfig = {
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
          hide_side_toolbar: true,
          allow_symbol_change: true,
          hide_top_toolbar: true,
          save_image: false,
          container_id: containerId.current,
          library_path: "https://s3.tradingview.com/tv.js",
          auto_save_delay: 30,
          debug: false,
          studies_overrides: {
            "volume.volume.transparency": 50,
            "volume.volume.color.0": "rgba(255,0,0,0.5)",
            "volume.volume.color.1": "rgba(0,255,0,0.5)"
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
            "volume_force_overlay",
            "save_chart_properties_to_local_storage",
            "create_volume_indicator_by_default",
            "create_volume_indicator_by_default_once",
            "timeframes_toolbar",
            "show_hide_button_in_legend",
            "study_dialog_search_control",
            "show_spread_operators",
            "property_pages",
            "show_chart_property_page",
            "chart_crosshair_menu",
            "chart_events",
            "header_saveload",
            "control_bar",
            "edit_buttons_in_legend",
            "context_menus",
            "popup_hints",
            "use_localstorage",
            "save_chart_properties",
            "save_study_templates",
            "display_market_status",
            "edit_buttons_in_legend",
            "timezone_menu",
            "screenshot_button",
            "show_logo_on_all_charts",
            "show_object_tree",
            "datasource_copypaste",
            "study_templates",
            "trading_notifications",
            "source_selection_markers",
            "scales_context_menu",
            "go_to_date",
            "adaptive_logo"
          ],
          enabled_features: [
            "remove_library_container_border",
            "side_toolbar_in_fullscreen_mode",
            "disable_resolution_rebuild"
          ],
          overrides: {
            "mainSeriesProperties.showPriceLine": true,
            "paneProperties.background": "#131722",
            "paneProperties.vertGridProperties.color": "#363c4e",
            "paneProperties.horzGridProperties.color": "#363c4e",
            "symbolWatermarkProperties.transparency": 90,
            "scalesProperties.textColor": "#AAA",
            "mainSeriesProperties.candleStyle.wickUpColor": '#336854',
            "mainSeriesProperties.candleStyle.wickDownColor": '#7f323f',
            "mainSeriesProperties.candleStyle.drawBorder": true,
            "mainSeriesProperties.candleStyle.borderUpColor": '#336854',
            "mainSeriesProperties.candleStyle.borderDownColor": '#7f323f',
            "mainSeriesProperties.candleStyle.upColor": '#336854',
            "mainSeriesProperties.candleStyle.downColor": '#7f323f',
            "mainSeriesProperties.candleStyle.drawWick": true,
            "mainSeriesProperties.candleStyle.drawBody": true,
            "mainSeriesProperties.candleStyle.wickColorSource": "open",
            "mainSeriesProperties.showCountdown": false,
            "mainSeriesProperties.visible": true,
            "mainSeriesProperties.priceLineWidth": 1,
            "mainSeriesProperties.lockScale": false,
            "mainSeriesProperties.minTick": "default",
            "mainSeriesProperties.extendedHours": false
          },
          loading_screen: { backgroundColor: "#131722" }
        };

        // Create widget with safe config
        const tvWidget = new window.TradingView.widget(safeConfig);
        widgetRef.current = tvWidget;

        // Safe onChartReady handling with timeout
        if (typeof tvWidget.onChartReady === 'function' && onChartReady) {
          const timeoutId = setTimeout(() => {
            if (container) {
              container.innerHTML = 'Chart initialization timeout';
            }
          }, 30000); // 30 saniye timeout

          tvWidget.onChartReady(() => {
            clearTimeout(timeoutId);
            try {
              onChartReady(tvWidget);
            } catch (error) {
              console.error('Chart ready callback error:', error);
              container.innerHTML = 'Chart initialization failed';
            }
          });
        }
      } catch (error) {
        console.error('Widget initialization error:', error);
        if (container) {
          container.innerHTML = 'Failed to initialize chart';
        }
      }
    };

    // Load TradingView script with enhanced security
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      const scriptHash = process.env.NEXT_PUBLIC_TRADINGVIEW_SCRIPT_HASH;
      if (scriptHash) {
        script.integrity = scriptHash;
      }
      
      // Add nonce for CSP
      script.nonce = (window as any).__NEXT_DATA__?.props?.nonce || '';
      
      // Add additional security attributes
      script.setAttribute('referrerpolicy', 'no-referrer');
      script.setAttribute('fetchpriority', 'high');
      
      const timeoutId = setTimeout(() => {
        console.error('Script load timeout');
        if (container) {
          container.innerHTML = 'Failed to load chart (timeout)';
        }
      }, 10000); // 10 saniye timeout

      script.onload = () => {
        clearTimeout(timeoutId);
        loadWidget();
      };
      
      script.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('Failed to load TradingView script:', error);
        if (container) {
          container.innerHTML = 'Failed to load chart';
        }
      };

      // Remove existing script if any
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }

      document.head.appendChild(script);
      scriptRef.current = script;
    };

    // Load script only if not already loaded
    if (!window.TradingView) {
      loadScript();
    } else {
      loadWidget();
    }

    // Enhanced cleanup function
    return () => {
      // Clear timeouts
      const timeouts = widgetRef.current?._timeouts || [];
      timeouts.forEach((id: number) => clearTimeout(id));

      // Clear intervals
      const intervals = widgetRef.current?._intervals || [];
      intervals.forEach((id: number) => clearInterval(id));

      // Remove script
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }

      // Clear container
      if (container) {
        container.innerHTML = '';
      }

      // Cleanup widget
      if (widgetRef.current) {
        try {
          if (typeof widgetRef.current.remove === 'function') {
            widgetRef.current.remove();
          }
          widgetRef.current = null;
        } catch (error) {
          console.error('Widget cleanup error:', error);
        }
      }

      // Clear localStorage
      const tvStorageKeys = Array.from(Array(localStorage.length), (_, i) => localStorage.key(i))
        .filter((key): key is string => key !== null && key.startsWith('tradingview'));
      tvStorageKeys.forEach(key => localStorage.removeItem(key));
    };
  }, [symbol, interval, onChartReady, isFullscreen]);

  return (
    <div 
      id={containerId.current} 
      className="tradingview-widget"
      data-testid="tradingview-widget"
      aria-label="TradingView Chart"
    />
  );
};

// CoinGecko ID resolver
const getCoinGeckoId = async (symbol: string, selectedCoinId?: string): Promise<string | null> => {
  // If we have a selected coin ID, use it directly
  if (selectedCoinId) {
    return selectedCoinId;
  }

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
        const priceCheck = await fetch(`https://pro-api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`, {
          method: 'GET',
          headers: createHeaders()
        });
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
const getChartData = async (symbol: string, selectedCoinId?: string): Promise<ChartData | null> => {
  try {
    const coinId = selectedCoinId || await getCoinGeckoId(symbol);
    if (!coinId) {
      console.error('Could not find CoinGecko ID for symbol:', symbol);
      return null;
    }

    // Use the CoinGecko ID directly in the fetch requests
    const coinResponse = await fetch(`/api/coingecko?endpoint=coins/${coinId}&params=localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`, {
      method: 'GET',
      headers: createHeaders()
    });
    if (!coinResponse.ok) {
      const error = await coinResponse.json();
      console.error('Coin data fetch error:', error);
      return null;
    }
    const coinData = await coinResponse.json();

    // Get historical price data
    const historicalResponse = await fetch(`/api/coingecko?endpoint=coins/${coinId}/market_chart`, {
      method: 'GET',
      headers: createHeaders()
    });
    if (!historicalResponse.ok) {
      const error = await historicalResponse.json();
      console.error('Historical data fetch error:', error);
      return null;
    }
    const historicalData = await historicalResponse.json();

    // Get OHLCV data
    const ohlcResponse = await fetch(`/api/coingecko?endpoint=coins/${coinId}/ohlc`, {
      method: 'GET',
      headers: createHeaders()
    });
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
      // Disconnect Solflare specifically
      if ((window as any).solflare) {
        try {
          await (window as any).solflare.disconnect();
        } catch (e) {
          console.error('Error disconnecting Solflare:', e);
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
      
      // Clear specific wallet items
      const walletKeys = [
        // Phantom keys
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
        'phantom.wallet.preferences',
        // Solflare keys
        'solflare.selectedAccount',
        'solflare.autoConnect',
        'solflare.wallet.autoConnect',
        'solflare-recent-account',
        'solflare-wallet-accounts',
        'solflare-wallet-preferences',
        'solflare-connection-strategy',
        'solflare-encrypted-private-key',
        'solflare-public-key',
        'solflare-account-state'
      ];
      
      walletKeys.forEach(key => {
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
  // Common coin symbols pattern (3-5 characters followed by optional USDT)
  const symbolPattern = /\b[A-Za-z]{3,5}(?:USDT)?\b/g;
  const matches = message.match(symbolPattern);
  
  if (!matches) return null;
  
  // Filter out common words that might match the pattern
  const commonWords = ['USDT', 'WHAT', 'WHEN', 'WHERE', 'WILL', 'DOES', 'THIS', 'THAT', 'HELP', 'LOOK', 'TELL'];
  const possibleSymbols = matches.filter(match => !commonWords.includes(match.toUpperCase()));
  
  return possibleSymbols[0] || null;
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

// Add this near the top of the file with other constants
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

if (!COINGECKO_API_KEY) {
  console.error('CoinGecko API key is not set in environment variables');
}

// Helper function to create headers
const createHeaders = (): HeadersInit => {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-internal-request': 'true'
  };
};

export default function AnalistMoai() {
  const hasCheckedBalance = useRef(false);
  const { connected, publicKey, disconnect, connect } = useWallet();
  const [hasToken, setHasToken] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
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
  const [userLanguage, setUserLanguage] = useState<'en' | 'tr'>('en');
  const [suggestions, setSuggestions] = useState<CoinSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinSuggestion | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [maxSuggestions, setMaxSuggestions] = useState(5);

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

  // Placeholder effect
  useEffect(() => {
    if (!placeholders[userLanguage]) return;

    const interval = setInterval(() => {
      setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);
    }, 3000);

    // Set initial placeholder
    setCurrentPlaceholder(placeholders[userLanguage][Math.floor(Math.random() * placeholders[userLanguage].length)]);

    return () => clearInterval(interval);
  }, [userLanguage, placeholders, setCurrentPlaceholder]);

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

  // Add a useEffect to calculate the maximum number of suggestions that can fit
  useEffect(() => {
    const calculateMaxSuggestions = () => {
      const container = suggestionsRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const suggestionItemWidth = 150; // Approximate width of a suggestion item
      const maxSuggestions = Math.floor(containerWidth / suggestionItemWidth);

      setMaxSuggestions(maxSuggestions);
    };

    calculateMaxSuggestions();
    window.addEventListener('resize', calculateMaxSuggestions);

    return () => window.removeEventListener('resize', calculateMaxSuggestions);
  }, []);

  // Update the fetchCoinSuggestions function to ensure it fetches and displays 5 coins
  const fetchCoinSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/coingecko?endpoint=search&params=query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Check if there are any coin results before processing
      if (!data.coins || data.coins.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      // Filter and format suggestions, ensure to fetch and display 5 suggestions
      const formattedSuggestions = data.coins
        .slice(0, 5) // Limit to 5 suggestions
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
    setSelectedCoin(null);
    setInput('');
    setIsMessageLoading(true);

    try {
      // Add user message first
      const newUserMessage: Message = { 
        type: 'user', 
        content: userInput,
        timestamp: Date.now(),
        coin: selectedCoin || undefined
      };
      setMessages(prev => [...prev, newUserMessage]);

      // First, detect the language
      const languagePrompt = await callOpenAI([
        {
          role: "system",
          content: `You are a language detector. Analyze the given text and return ONLY "tr" for Turkish or "en" for English in your response. Nothing else.`
        },
        {
          role: "user",
          content: userInput
        }
      ]);

      const detectedLanguage = languagePrompt.trim().toLowerCase() as 'en' | 'tr';
      setUserLanguage(detectedLanguage);

      // Extract coin symbol if no coin is selected
      const coinSymbol = selectedCoin ? selectedCoin.symbol : extractCoinSymbol(userInput);
      
      if (!selectedCoin && !coinSymbol) {
        const noCoinMessage: Message = {
          type: 'bot',
          content: detectedLanguage === 'tr'
            ? "Mesajınızda geçerli bir coin sembolü bulamadım. Lütfen analiz etmek istediğiniz coini belirtin."
            : "I couldn't find a valid coin symbol in your message. Please specify which coin you'd like me to analyze.",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, noCoinMessage]);
        setIsMessageLoading(false);
        return;
      }

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

      // Get chart data using selected coin ID if available
      const chartData = await getChartData(coinSymbol || '', selectedCoin?.id);

      // Get previous conversation context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      // Analyze the user's input to determine the type of analysis needed
      const analysisTypePrompt = await callOpenAI([
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
      ]);

      const analysisTypeResult = analysisTypePrompt.trim() || "GENERAL_ANALYSIS";

      // Send the analysis
      const analysisPrompt = await callOpenAI([
        {
          role: 'system',
          content: detectedLanguage === 'tr' ? 
            `Sen MOAI'sin - kripto piyasalarının en zeki teknik analisti. Analizini TAM OLARAK 3 PARAGRAFTA yap:

            1. PARAGRAF: Fiyat hareketleri analizi. Fiyatın genel trendini ve momentum durumunu değerlendir. Fiyatın son dönemdeki hareketlerini ve önemli fiyat seviyelerini açıkla.

            2. PARAGRAF: Teknik göstergeleri analiz et (RSI, MACD, BB, SMA'lar). Trend analizi yap ve hacim analizini değerlendir. Farklı periyotlardaki (20, 50, 200) hareketli ortalamaların konumlarını ve ne anlama geldiklerini açıkla.

            3. PARAGRAF: Kullanıcının spesifik sorusunu cevapla. Eğer fiyat tahmini isteniyorsa, teknik göstergelere dayalı tahmin yap. Kısa ve orta vadeli hedefleri belirt.

            ÖNEMLİ KURALLAR:
            - Kesinlikle 3 paragraftan fazla yazma
            - Her paragraf en fazla 4-5 cümle olsun
            - Tüm sayısal değerleri **kalın** yaz
            - Teknik terimleri doğal bir dilde açıkla
            - Başlık veya liste kullanma, düz metin yaz

            Not: Bu analiz eğitim amaçlıdır.` :
            `You are MOAI - the smartest technical analyst in crypto markets. Present your analysis in EXACTLY 3 PARAGRAPHS:

            1ST PARAGRAPH: Price action analysis. Evaluate the general trend and momentum state. Explain recent price movements and significant price levels.

            2ND PARAGRAPH: Analyze technical indicators (RSI, MACD, BB, SMAs). Perform trend analysis and evaluate volume analysis. Explain the positions of different period moving averages (20, 50, 200) and what they mean.

            3RD PARAGRAPH: Answer the user's specific question. If price prediction is requested, make a forecast based on technical indicators. Specify short and medium-term targets.

            IMPORTANT RULES:
            - Never write more than 3 paragraphs
            - Each paragraph should be 4-5 sentences maximum
            - Write all numerical values in **bold**
            - Explain technical terms conversationally
            - No headers or lists, just plain text

            Note: This analysis is for educational purposes only.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: `Analyze ${coinSymbol} with the following data: ${JSON.stringify(chartData)}
          User's specific question: ${userInput || 'general analysis'}`
        }
      ], "gpt-4-turbo-preview");

      const botResponse = analysisPrompt || 
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

  // Wallet icons in base64
  const walletIcons = {
    phantom: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzUxMWVlNzt9PC9zdHlsZT48L2RlZnM+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTIzLjUzLDI5LjA3bC0zLjEyLTMuMTJhMTUuMzcsMTUuMzcsMCwwLDAtMjEuNzUsMGwtMi4xMiwyLjEyYTE1LjM3LDE1LjM3LDAsMCwwLDAsMjEuNzVsMy4xMiwzLjEyYTE1LjM3LDE1LjM3LDAsMCwwLDIxLjc1LDBsMi4xMi0yLjEyQTE1LjM3LDE1LjM3LDAsMCwwLDEyMy41MywyOS4wN1oiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik05OC41Myw1NC4wN2wtMy4xMi0zLjEyYTE1LjM3LDE1LjM3LDAsMCwwLTIxLjc1LDBsLTIuMTIsMi4xMmExNS4zNywxNS4zNywwLDAsMCwwLDIxLjc1bDMuMTIsMy4xMmExNS4zNywxNS4zNywwLDAsMCwyMS43NSwwbDIuMTItMi4xMkExNS4zNywxNS4zNywwLDAsMCw5OC41Myw1NC4wN1oiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik03My41Myw3OS4wN2wtMy4xMi0zLjEyYTE1LjM3LDE1LjM3LDAsMCwwLTIxLjc1LDBsLTIuMTIsMi4xMmExNS4zNywxNS4zNywwLDAsMCwwLDIxLjc1bDMuMTIsMy4xMmExNS4zNywxNS4zNywwLDAsMCwyMS43NSwwbDIuMTItMi4xMkExNS4zNywxNS4zNywwLDAsMCw3My41Myw3OS4wN1oiLz48L3N2Zz4=",
    solflare: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMTMuNjkgNjUuMzJDMTEzLjY5IDkzLjUyIDkwLjg5IDExNi4zMiA2Mi42OSAxMTYuMzJDMzQuNDkgMTE2LjMyIDExLjY5IDkzLjUyIDExLjY5IDY1LjMyQzExLjY5IDM3LjEyIDM0LjQ5IDE0LjMyIDYyLjY5IDE0LjMyQzkwLjg5IDE0LjMyIDExMy42OSAzNy4xMiAxMTMuNjkgNjUuMzJaIiBmaWxsPSIjRkY4ODAwIi8+CjxwYXRoIGQ9Ik02Mi42OSA5LjMyQzMxLjY5IDkuMzIgNi42OSAzNC4zMiA2LjY5IDY1LjMyQzYuNjkgOTYuMzIgMzEuNjkgMTIxLjMyIDYyLjY5IDEyMS4zMkM5My42OSAxMjEuMzIgMTE4LjY5IDk2LjMyIDExOC42OSA2NS4zMkMxMTguNjkgMzQuMzIgOTMuNjkgOS4zMiA2Mi42OSA5LjMyWk02Mi42OSAxMTEuMzJDMzcuMTkgMTExLjMyIDE2LjY5IDkwLjgyIDE2LjY5IDY1LjMyQzE2LjY5IDM5LjgyIDM3LjE5IDE5LjMyIDYyLjY5IDE5LjMyQzg4LjE5IDE5LjMyIDEwOC42OSAzOS44MiAxMDguNjkgNjUuMzJDMTA4LjY5IDkwLjgyIDg4LjE5IDExMS4zMiA2Mi42OSAxMTEuMzJaIiBmaWxsPSIjRkY4ODAwIi8+CjxwYXRoIGQ9Ik04Mi42OSA2NS4zMkM4Mi42OSA3Ni4zNyA3My43NCA4NS4zMiA2Mi42OSA4NS4zMkM1MS42NCA4NS4zMiA0Mi42OSA3Ni4zNyA0Mi42OSA2NS4zMkM0Mi42OSA1NC4yNyA1MS42NCA0NS4zMiA2Mi42OSA0NS4zMkM3My43NCA0NS4zMiA4Mi42OSA1NC4yNyA4Mi42OSA2NS4zMloiIGZpbGw9IiNGRjg4MDAiLz4KPC9zdmc+Cg==",
    metamask: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2U4ODIxZTt9LmNscy0ye2ZpbGw6I2U0NzYxYjt9LmNscy0ze2ZpbGw6I2Q3NjgwZDt9LmNscy00e2ZpbGw6I2RkNjkwZjt9LmNscy01e2ZpbGw6I2M1NWYwZTt9LmNscy02e2ZpbGw6I2Q1NjkwZjt9LmNscy03e2ZpbGw6I2U2NzYxYjt9PC9zdHlsZT48L2RlZnM+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTEzLjY5LDI1LjM3LDY4LjE3LDU2LjkyLDc2LjQsMzQuMjRaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMTQuMzEsMjUuMzcsNTkuNDEsNTcuMjUsNTEuNiwzNC4yNFoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik05OC4yOCw4Mi43Niw4Ny4wNywxMDAuMTNsMjQuNzUsNi44MUwxMTgsODNaIi8+PHBhdGggY2xhc3M9ImNscy0zIiBkPSJNMTAsMTAyLjk0LDE2LjE3LDgzLDkuODIsODMuNloiLz48cGF0aCBjbGFzcz0iY2xzLTQiIGQ9Ik02NC4zMSw2MS4zOGwtNS4xNCwxMi4yNSwzMC44MywxLjQyTDg3LjA3LDYxLjM4WiIvPjxwYXRoIGNsYXNzPSJjbHMtNCIgZD0iTTQwLjkzLDc1LjA1bC01LjE0LTEyLjI1LTIyLjc2LDBMMTAuMSw3NS4wNVoiLz48cGF0aCBjbGFzcz0iY2xzLTUiIGQ9Ik00MC45Myw3NS4wNWwxNi4xNy0uMzMtMS40Mi0xNS41WiIvPjxwYXRoIGNsYXNzPSJjbHMtNiIgZD0iTTg3LjA3LDc1LjA1LDcwLjksNzQuNzJsMS40Mi0xNS41WiIvPjxwYXRoIGNsYXNzPSJjbHMtNyIgZD0iTTU3LjEsNzQuNzIsNTguNTIsOTAuMjJsMS43NS0yMi43NloiLz48cGF0aCBjbGFzcz0iY2xzLTciIGQ9Ik03MC45LDc0LjcyLDY3LjczLDY3LjQ2bDEuNzUsMjIuNzZaIi8+PC9zdmc+"
  };

  const handleConnect = async (walletName: string) => {
    try {
      if (walletName === 'phantom') {
        await connect();
      } else if (walletName === 'solflare') {
        // Solflare bağlantı işlemi
        const provider = (window as any).solflare;
        if (provider) {
          await provider.connect();
        } else {
          window.open('https://solflare.com', '_blank');
        }
      } else if (walletName === 'metamask') {
        // MetaMask bağlantı işlemi
        const provider = (window as any).ethereum;
        if (provider) {
          await provider.request({ method: 'eth_requestAccounts' });
        } else {
          window.open('https://metamask.io', '_blank');
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
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
              href="https://raydium.io/swap/?inputMint=So11111111111111111111111111111111111111112&outputMint=2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M"
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
              </svg>
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
          <div className="relative flex items-center gap-3">
            {connected ? (
              <>
                <button
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  className="p-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                  title="Wallet Options"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                </button>
                
                {/* Wallet Dropdown */}
                {showWalletDropdown && (
                  <>
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowWalletDropdown(false)} />
                    <div className="fixed top-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-b border-purple-900/50 shadow-xl shadow-black/20 p-4 z-50 animate-slide-down">
                      <div className="max-w-4xl mx-auto relative">
                        <button
                          onClick={() => setShowWalletDropdown(false)}
                          className="absolute right-0 p-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="pr-10">
                          <div className="space-y-1 mb-3">
                            <p className="text-sm text-purple-300/80">Connected Wallet</p>
                            <p className="text-xs text-purple-400/60 break-all font-mono">{publicKey?.toBase58()}</p>
                          </div>
                          <button
                            onClick={() => handleDisconnect(disconnect)}
                            className="w-full bg-red-600/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Disconnect Wallet
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                        <Image src={message.coin.thumb} alt={message.coin.symbol} width={16} height={16} className="rounded-full" />
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
                                        <Image src={coin.thumb} alt={coin.symbol} width={16} height={16} className="rounded-full" />
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
                <Image src={suggestion.thumb} alt={suggestion.name} width={20} height={20} className="rounded-full" />
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
                  <Image src={selectedCoin.thumb} alt={selectedCoin.name} width={20} height={20} className="rounded-full" />
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