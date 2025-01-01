'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBot, setCurrentBot] = useState(0);

  const bots = [
    {
      title: "Gazeteci MOAI",
      image: "/contents/gazeteci-moai.jpg",
      description: "Kripto haberlerini ve piyasa verilerini anlık olarak takip eden, detaylı analizler sunan yapay zeka asistanı.",
      href: "/gazeteci-moai",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
      ),
      isActive: true
    },
    {
      title: "Analist MOAI",
      image: "/contents/analist-moai.jpg",
      description: "Teknik analiz yapan, fiyat tahminleri ve trading stratejileri üreten yapay zeka asistanı. (Yakında)",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      ),
      isActive: false
    },
    {
      title: "Trader MOAI",
      image: "/contents/trader-moai.jpg",
      description: "Otomatik alım-satım yapan, portföy yöneten ve risk analizi yapan yapay zeka asistanı. (Yakında)",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      ),
      isActive: false
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const nextBot = () => {
    setCurrentBot((prev) => (prev + 1) % bots.length);
  };

  const prevBot = () => {
    setCurrentBot((prev) => (prev - 1 + bots.length) % bots.length);
  };

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="container mx-auto px-4">
          <nav className="flex items-center h-20">
            {/* Logo */}
            <span className="text-2xl font-bold text-white mr-12">MOAI</span>
            
            {/* Hamburger Menu Button (Mobile) */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white p-2 ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
              </svg>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="https://t.me/moaigents" target="_blank" rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white font-light relative group">
                Telegram
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="https://x.com/moAI_Agent" target="_blank" rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white font-light relative group">
                X
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="https://dexscreener.com/solana/2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M" target="_blank" rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white font-light relative group">
                Dexscreener
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="https://medium.com/@6emirsahin/moai-i%CC%87lk-yapay-zeka-kripto-fenomeni-ve-ki%C5%9Fisel-yat%C4%B1r%C4%B1m-analisti-ada9eab498a5" target="_blank" rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white font-light relative group">
                Roadmap
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="https://www.youtube.com/@moaidirector" target="_blank" rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white font-light relative group">
                YouTube
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
            </div>
          </nav>

          {/* Mobile Navigation */}
          <div className={`md:hidden transition-all duration-300 ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-black/95`}>
            <div className="py-4 space-y-4">
              <a href="https://t.me/moaigents" target="_blank" rel="noopener noreferrer" 
                className="block px-4 py-2 text-gray-400 hover:text-white font-light">
                Telegram
              </a>
              <a href="https://x.com/moAI_Agent" target="_blank" rel="noopener noreferrer" 
                className="block px-4 py-2 text-gray-400 hover:text-white font-light">
                X
              </a>
              <a href="https://dexscreener.com/solana/2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M" target="_blank" rel="noopener noreferrer" 
                className="block px-4 py-2 text-gray-400 hover:text-white font-light">
                Dexscreener
              </a>
              <a href="https://medium.com/@6emirsahin/moai-i%CC%87lk-yapay-zeka-kripto-fenomeni-ve-ki%C5%9Fisel-yat%C4%B1r%C4%B1m-analisti-ada9eab498a5" target="_blank" rel="noopener noreferrer" 
                className="block px-4 py-2 text-gray-400 hover:text-white font-light">
                Roadmap
              </a>
              <a href="https://www.youtube.com/@moaidirector" target="_blank" rel="noopener noreferrer" 
                className="block px-4 py-2 text-gray-400 hover:text-white font-light">
                YouTube
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Background Sections */}
        <div className="absolute left-0 top-0 w-full md:w-2/3 h-full bg-black"></div>
        <div className="absolute right-0 top-0 hidden md:block w-1/3 h-full bg-gradient-to-b from-blue-900 to-black"></div>

        {/* Content Container */}
        <div className="relative min-h-screen container mx-auto px-4 flex items-center">
          <div className="flex flex-col md:flex-row w-full items-center">
            {/* Text Content */}
            <div className="w-full md:w-1/2 z-10 text-center md:text-left mb-8 md:mb-0 mt-20 md:mt-0">
              <h1 className="text-8xl md:text-[12rem] font-bold text-white relative animate-glow tracking-wide">
                MOAI
              </h1>
              <p className="text-xl md:text-3xl text-blue-300/80 max-w-2xl mt-4 font-light">
                A rock reborn after discovering Wi-Fi
              </p>
            </div>

            {/* Large MOAI Image */}
            <div className="hidden md:block absolute right-[-30%] h-screen w-[120%] top-0">
              <Image
                src="/moai.webp"
                alt="MOAI"
                fill
                className="object-contain"
                priority
              />
            </div>
            {/* Mobile MOAI Image */}
            <div className="relative md:hidden w-full h-[60vh] mb-8">
              <Image
                src="/moai.webp"
                alt="MOAI"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid - Desktop */}
      <div className="hidden md:block container mx-auto px-4 py-16">
        <div className="grid grid-cols-3 gap-8">
          {bots.map((bot, index) => (
            <div key={index} className={`${!bot.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {bot.isActive ? (
                <Link href={bot.href || '#'} className="block group">
                  <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-900/30 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
                    <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                      <Image
                        src={bot.image}
                        alt={bot.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                          {bot.icon}
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-blue-300">{bot.title}</h2>
                    </div>
                    <p className="text-gray-400">
                      {bot.description}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-900/30 transition-all duration-300 shadow-lg">
                  <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                    <Image
                      src={bot.image}
                      alt={bot.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                        {bot.icon}
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-blue-300">{bot.title}</h2>
                  </div>
                  <p className="text-gray-400">
                    {bot.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features Carousel - Mobile */}
      <div className="md:hidden container mx-auto px-4 py-16 relative">
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${currentBot * 100}%)` }}>
            {bots.map((bot, index) => (
              <div key={index} className="w-full flex-shrink-0 px-4">
                <div className={`${!bot.isActive ? 'opacity-50 cursor-not-allowed' : 'group'}`}>
                  <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-900/30 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
                    <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                      <Image
                        src={bot.image}
                        alt={bot.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                          {bot.icon}
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-blue-300">{bot.title}</h2>
                    </div>
                    <p className="text-gray-400">
                      {bot.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          onClick={prevBot} 
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full"
          disabled={currentBot === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button 
          onClick={nextBot} 
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full"
          disabled={currentBot === bots.length - 1}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-400">
        <p>© 2024 MOAI AI. Tüm hakları saklıdır.</p>
      </footer>
    </main>
  );
}

const styles = `
@keyframes glow {
  0%, 100% {
    text-shadow: 0 0 30px rgba(59, 130, 246, 0.5),
                 0 0 60px rgba(59, 130, 246, 0.3),
                 0 0 100px rgba(59, 130, 246, 0.2);
  }
  50% {
    text-shadow: 0 0 40px rgba(59, 130, 246, 0.6),
                 0 0 80px rgba(59, 130, 246, 0.4),
                 0 0 120px rgba(59, 130, 246, 0.3);
  }
}

.animate-glow {
  animation: glow 3s ease-in-out infinite;
}
`; 