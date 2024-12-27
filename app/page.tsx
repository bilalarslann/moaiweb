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
                  Yapay Zeka Yatırım Analisti Temsilciniz
                </p>
                <p className="text-base md:text-lg font-light text-gray-400 font-roboto">
                  Wi-Fi'yi keşfettikten sonra yeniden doğan bir kaya
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
        <header className="absolute top-0 left-0 w-full py-4 px-6 z-50">
          <nav className="flex items-center gap-8">
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
              Yasal Uyarı
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
                <h3 className="text-4xl md:text-6xl font-bold text-white">Gazeteci MOAI</h3>
                <p className="text-gray-400 text-sm md:text-base font-light">
                  İstediğiniz coin'i inceler, size coin hakkında analiz yapar ve son dakika verilerini sunar.
                </p>
                <div className="flex justify-end">
                  <a href="/gazeteci-moai" className="mt-4 px-4 md:px-6 py-2 border-2 border-white text-white rounded-lg transition-all duration-300 hover:bg-blue-900 hover:border-blue-900 hover:text-white hover:shadow-lg hover:shadow-blue-900/50 flex items-center gap-2 text-sm md:text-base">
                    <span>🔎</span>
                    Analiz Yap
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
                <h3 className="text-4xl md:text-6xl font-bold text-white">Finansal Analiz Bot</h3>
                <p className="text-gray-400 text-sm md:text-base font-light">
                  Portföyünüzü titizlikle inceler, derinlemesine analiz eder ve size kişiselleştirilmiş finansal tavsiyeler sunar.
                </p>
                <div className="flex justify-end">
                  <button className="mt-4 px-4 md:px-6 py-2 border-2 border-white text-white rounded-lg transition-all duration-300 hover:bg-blue-900 hover:border-blue-900 hover:text-white hover:shadow-lg hover:shadow-blue-900/50 flex items-center gap-2 text-sm md:text-base">
                    <span>🔒</span>
                    Çok Yakında
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
              <span className="text-blue-500">1.</span> Yatırım Tavsiyesi Değildir
            </h2>
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed">
              <p className="transition-all duration-300 hover:text-white">
                MoAI Agent tarafından sağlanan tüm içerikler, özetler, analizler, yorumlar veya görüşler yalnızca bilgilendirme amaçlıdır.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                Bu içerikler yatırım tavsiyesi, finansal rehberlik veya $MoAI token ya da herhangi bir varlık için alım-satım önerisi olarak değerlendirilmemelidir.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                Kullanıcılar, kendi araştırmalarını yapmalı ve yatırım kararları almadan ��nce nitelikli profesyonellerden danışmanlık almalıdır.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                $MoAI tokeni, herhangi bir mülkiyet, ortaklık veya projede hak iddiası anlamına gelmez.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                Tokenin değeri piyasa koşullarına bağlıdır ve değerdeki dalgalanmalardan kaynaklanabilecek kayıplar tamamen kullanıcı sorumluluğundadır.
              </p>
            </div>
          </div>

          {/* Second Section */}
          <div className="bg-black/30 rounded-xl p-6 md:p-8 border border-blue-900/30 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-blue-500">2.</span> MoAI Agent'ın İçeriklerinin Doğası
            </h2>
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed">
              <p className="transition-all duration-300 hover:text-white">
                MoAI Agent, girdilere göre içerikler üretir ve bu içerikler, tahmin edilemez, eksik veya yanlış bilgiler içerebilir.
              </p>
              <p className="transition-all duration-300 hover:text-white">
                Sağlanan içeriklerin doğruluğu garanti edilmez ve kullanıcılar bu bilgileri kendi sorumluluklar�� dahilinde kullanmalıdır.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 