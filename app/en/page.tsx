'use client';
import React, { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 1055, y: 162 });
  const [glowPosition2, setGlowPosition2] = useState({ x: 932, y: 187 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculateDistance = () => {
    const dx1 = mousePosition.x - glowPosition.x;
    const dy1 = mousePosition.y - glowPosition.y;
    const dx2 = mousePosition.x - glowPosition2.x;
    const dy2 = mousePosition.y - glowPosition2.y;
    
    const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    return Math.min(distance1, distance2);
  };

  const getGlowStyle = (position: { x: number, y: number }) => {
    const distance = calculateDistance();
    const maxDistance = 800;
    const minSize = 13;
    const maxSize = 140;
    const minOpacity = 0.1;
    const maxOpacity = 0.7;

    const intensity = Math.max(0, 1 - distance / maxDistance);
    const size = minSize + (maxSize - minSize) * intensity;
    const opacity = minOpacity + (maxOpacity - minOpacity) * intensity;

    return {
      background: `radial-gradient(${size}px circle at ${position.x}px ${position.y}px, rgba(190, 229, 228, ${opacity}), transparent 100%)`,
    };
  };

  return (
    <div className="flex flex-col bg-black">
      {/* First Page - Full Screen */}
      <div className="h-screen relative">
        {/* Content Container with Background */}
        <div className="relative z-10 h-full">
          {/* Main Content */}
          <main className="flex flex-col md:flex-row flex-1 h-[calc(100vh-88px)]">
            {/* Left Section - Black */}
            <div className="w-full md:w-2/3 bg-black/80 p-8 relative overflow-hidden">
              <div className="h-full flex flex-col justify-center relative">
                <h1 className="text-7xl md:text-9xl font-bold text-white font-roboto mb-4">
                  MOAI
                </h1>
                <p className="text-base md:text-lg font-light text-gray-400 font-roboto mb-1">
                  Your AI Investment Analyst Representative
                </p>
                <p className="text-base md:text-lg font-light text-gray-400 font-roboto">
                  A rock that was reborn after discovering Wi-Fi&apos;s potential
                </p>
              </div>
            </div>

            {/* Right Section - Gradient */}
            <div className="w-full md:w-1/3 h-32 md:h-auto bg-gradient-to-b from-blue-900/80 to-black/80">
            </div>
          </main>
        </div>

        {/* Background Image - Above background, below header */}
        <Image 
          src="/moai.webp"
          alt="MOAI"
          fill
          sizes="100vw"
          style={{ 
            objectFit: 'none',
            objectPosition: '800px -30px',
            transform: 'scale(1)'
          }}
          priority
          className="opacity-100 z-20"
        />
        
        {/* Fixed Glow Effects */}
        <div 
          className="absolute inset-0 pointer-events-none z-30"
          style={getGlowStyle(glowPosition)}
        />
        <div 
          className="absolute inset-0 pointer-events-none z-30"
          style={getGlowStyle(glowPosition2)}
        />

        {/* Standalone Header - Always on top */}
        <header className="absolute top-0 left-0 w-full py-4 px-0 z-50">
          <nav className="flex items-center gap-8 px-6">
            <span className="font-bold text-white font-roboto text-xl">MOAI</span>
            <a href="https://t.me/moaigents" target="_blank" rel="noopener noreferrer" className="group relative font-light text-gray-400 font-roboto">
              Telegram
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-400 transition-all group-hover:w-full"></span>
            </a>
            <a href="https://x.com/moAI_Agent" target="_blank" rel="noopener noreferrer" className="group relative font-light text-gray-400 font-roboto">
              X
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-400 transition-all group-hover:w-full"></span>
            </a>
            <a href="https://dexscreener.com/solana/bqn4vvy7mshha9x7lthr6rnpz6bvwp6nkrta3zc7evx1" target="_blank" rel="noopener noreferrer" className="group relative font-light text-gray-400 font-roboto">
              Dexscreener
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-400 transition-all group-hover:w-full"></span>
            </a>
            <a href="https://medium.com/@6emirsahin/moai-i%CC%87lk-yapay-zeka-kripto-fenomeni-ve-ki%CC%87%C5%9Fisel-yat%C4%B1r%C4%B1m-analisti-ada9eab498a5" target="_blank" rel="noopener noreferrer" className="group relative font-light text-gray-400 font-roboto">
              Roadmap
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-400 transition-all group-hover:w-full"></span>
            </a>
            <a href="#disclaimer" className="group relative font-light text-gray-400 font-roboto">
              Disclaimer
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-400 transition-all group-hover:w-full"></span>
            </a>
          </nav>
        </header>
      </div>

      {/* Contract Address Section */}
      <section className="w-full bg-gradient-to-b from-blue-950 to-black py-12">
        <div className="max-w-7xl mx-auto px-6">
          <a href="https://dexscreener.com/solana/bqn4vvy7mshha9x7lthr6rnpz6bvwp6nkrta3zc7evx1" 
             target="_blank" 
             rel="noopener noreferrer"
             className="group flex justify-center items-center hover:scale-105 transition-all duration-300">
            <span className="font-mono text-2xl md:text-3xl text-gray-200 group-hover:text-white transition-colors duration-300 tracking-wider">
              2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M
            </span>
          </a>
        </div>
      </section>

      {/* Bottom Section */}
      <section className="w-full bg-black px-4 md:px-8 py-8 md:py-16">
        <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
          {/* Left Frame */}
          <div className="flex-1 border-gray-800 rounded-lg p-2 h-[500px] md:h-[600px] overflow-hidden" style={{ borderWidth: '3px' }}>
            <div className="flex flex-col h-full">
              <div className="relative flex-1 rounded-lg overflow-hidden">
                <Image 
                  src="/news-moai.jpg"
                  alt="News Moai"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                  className="rounded-lg"
                />
              </div>
              <div className="p-4 space-y-2 mt-6">
                <h3 className="text-4xl md:text-6xl font-bold text-white">Journalist MOAI</h3>
                <p className="text-gray-400 text-sm md:text-base font-light">
                  Analyzes any coin you&apos;re interested in, provides analysis about the coin, and delivers real-time updates.
                </p>
                <div className="flex justify-end">
                  <a href="/gazeteci-moai" className="mt-4 px-4 md:px-6 py-2 border-2 border-white text-white rounded-lg transition-all duration-300 hover:bg-blue-900 hover:border-blue-900 hover:text-white hover:shadow-lg hover:shadow-blue-900/50 flex items-center gap-2 text-sm md:text-base">
                    <span>🔎</span>
                    Analyze
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Frame */}
          <div className="flex-1 border-gray-800 rounded-lg p-2 h-[500px] md:h-[600px] overflow-hidden" style={{ borderWidth: '3px' }}>
            <div className="flex flex-col h-full">
              <div className="relative flex-1 rounded-lg overflow-hidden">
                <Image 
                  src="/analysis-moai.jpg"
                  alt="Analysis Moai"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                  className="rounded-lg"
                />
              </div>
              <div className="p-4 space-y-2 mt-6">
                <h3 className="text-4xl md:text-6xl font-bold text-white">Financial Analysis Bot</h3>
                <p className="text-gray-400 text-sm md:text-base font-light">
                  Carefully examines your portfolio, performs in-depth analysis, and provides personalized financial advice.
                </p>
                <div className="flex justify-end">
                  <button className="mt-4 px-4 md:px-6 py-2 border-2 border-white text-white rounded-lg transition-all duration-300 hover:bg-blue-900 hover:border-blue-900 hover:text-white hover:shadow-lg hover:shadow-blue-900/50 flex items-center gap-2 text-sm md:text-base">
                    <span>🔒</span>
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer Section */}
      <section id="disclaimer" className="w-full bg-gradient-to-b from-blue-900 to-black p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* First Section */}
          <div className="bg-black/30 rounded-xl p-6 md:p-8 border border-blue-900/30 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-blue-500">1.</span> Not Financial Advice
            </h2>
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed">
              <p className="transition-all duration-300 hover:text-white">
                All content, summaries, analyses, comments, or opinions provided by MoAI Agent are for informational purposes only.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                This content should not be considered as investment advice, financial guidance, or a recommendation to buy or sell $MoAI token or any other asset.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                Users should conduct their own research and seek advice from qualified professionals before making investment decisions.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                The $MoAI token does not represent any ownership, partnership, or claim to rights in the project.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                Token value is subject to market conditions, and any losses resulting from value fluctuations are entirely the user's responsibility.
              </p>
            </div>
          </div>

          {/* Second Section */}
          <div className="bg-black/30 rounded-xl p-6 md:p-8 border border-blue-900/30 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-blue-500">2.</span> Nature of MoAI Agent's Content
            </h2>
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed">
              <p className="transition-all duration-300 hover:text-white">
                MoAI Agent generates content based on inputs, and this content may contain unpredictable, incomplete, or incorrect information.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                The accuracy of provided content is not guaranteed, and users should use this information at their own risk.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 