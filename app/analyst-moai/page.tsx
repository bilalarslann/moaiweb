'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';

type Message = {
  type: 'user' | 'bot';
  content: string;
  chart?: {
    symbol: string;
    interval?: string;
  };
};

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// TradingView types
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
  }
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
  const [currentSymbol, setCurrentSymbol] = useState(`BINANCE:${symbol}USDT`);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    let widget: any = null;
    const container = document.getElementById(`tradingview_${symbol}`);
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
            symbol: currentSymbol,
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
            container_id: `tradingview_${symbol}`,
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
              "header_fullscreen_button"
            ],
            enabled_features: ["study_templates"],
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
                {
                  name: "Support",
                  grayed: false
                },
                {
                  name: "Resistance",
                  grayed: false
                },
                {
                  name: "TrendLine",
                  grayed: false
                }
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
              "mainSeriesProperties.candleStyle.wickDownColor": '#ef5350'
            },
            loading_screen: { backgroundColor: "#131722" },
            time_frames: [
              { text: "1D", resolution: "D", description: "1 Day" },
              { text: "4H", resolution: "240", description: "4 Hours" },
              { text: "1H", resolution: "60", description: "1 Hour" },
              { text: "30m", resolution: "30", description: "30 Minutes" },
              { text: "15m", resolution: "15", description: "15 Minutes" },
              { text: "5m", resolution: "5", description: "5 Minutes" }
            ]
          });

          widgetRef.current = widget;

          widget.onChartReady(() => {
            console.log('Chart is ready');
            if (onChartReady) {
              onChartReady(widget);
            }
          });
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
  }, [symbol, interval, currentSymbol, onChartReady, isFullscreen]);

  return (
    <div className="tradingview-widget-container h-full">
      <div id={`tradingview_${symbol}`} className={`w-full ${isFullscreen ? 'h-screen' : 'h-[400px]'} rounded-xl overflow-hidden`} />
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

    // Get current price and 24h stats
    const [priceResponse, klinesResponse] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`),
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=1d&limit=30`)
    ]);

    const priceData = await priceResponse.json();
    const klinesData = await klinesResponse.json();

    // Set current price
    chartData.price = parseFloat(priceData.price);

    // Calculate indicators from klines data
    if (klinesData && klinesData.length > 0) {
      const closes = klinesData.map((k: any) => parseFloat(k[4]));
      
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
    }

    console.log('Retrieved Chart Data:', chartData);
    return chartData;
  } catch (error) {
    console.error('Error getting chart data:', error);
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

  const placeholders = [
    "Can you do technical analysis for Bitcoin?",
    "What's the price target for Ethereum?",
    "Analyze BTC/USD chart",
    "How's the market looking?",
    "When will altcoin season start?",
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
      const symbolCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Extract the cryptocurrency symbol and chart display request from the given message. Return the answer in JSON format.
            Example: { "symbol": "BTC", "showChart": true, "onlyChart": true/false }
            
            If the message contains any of these cases, showChart should be true:
            - Chart display request
            - Technical analysis request
            - Support/resistance analysis request
            - Price analysis request
            - Trend analysis request
            
            If the message only requests to show the chart, onlyChart should be true.
            Example messages and responses:
            "Show Bitcoin chart" -> { "symbol": "BTC", "showChart": true, "onlyChart": true }
            "Just BTC chart" -> { "symbol": "BTC", "showChart": true, "onlyChart": true }
            "How's BTC?" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
            "ETH chart" -> { "symbol": "ETH", "showChart": true, "onlyChart": true }
            "Analyze Ethereum" -> { "symbol": "ETH", "showChart": true, "onlyChart": false }
            "What are Bitcoin's support and resistance levels?" -> { "symbol": "BTC", "showChart": true, "onlyChart": false }
            "Tell me about cryptocurrencies" -> { "symbol": null, "showChart": false, "onlyChart": false }
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
        // First, send just the chart
        setMessages(prev => [...prev, {
          type: 'bot',
          content: '',
          chart: {
            symbol: symbol
          }
        }]);

        if (!onlyChart) {
          try {
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
                  content: `You are ANALYST MOAI, an AI cryptocurrency analyst assistant.
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
                  content: `Provide a detailed technical analysis for ${symbol} based on the chart indicators.`
                }
              ],
              model: "gpt-3.5-turbo",
            });

            const botResponse = completion.choices[0]?.message?.content || "Sorry, an error occurred. Please try again.";
            
            setMessages(prev => [...prev, {
              type: 'bot',
              content: botResponse
            }]);
          } catch (error) {
            console.error('Analysis error:', error);
            setMessages(prev => [...prev, {
              type: 'bot',
              content: 'Sorry, an error occurred. Please try again.'
            }]);
          }
        }
      } else {
        // Regular response without chart
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are ANALYST MOAI, an AI cryptocurrency analyst assistant.
              You can provide general information about cryptocurrency markets.`
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          model: "gpt-3.5-turbo",
        });

        const botResponse = completion.choices[0]?.message?.content || "Sorry, an error occurred. Please try again.";
        
        setMessages(prev => [...prev, {
          type: 'bot',
          content: botResponse
        }]);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Sorry, an error occurred. Please try again.'
      }]);
    }

    setIsLoading(false);
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
                <div className="mt-4 mb-4 relative">
                  <button
                    onClick={() => message.chart && setFullscreenChart(message.chart)}
                    className="absolute top-4 right-4 z-10 bg-gray-800/50 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
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

      {/* Input Area */}
      <div className="border-t border-purple-900/30 bg-black/30 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
        </form>
      </div>
    </div>
  );
} 