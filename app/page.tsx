'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBot, setCurrentBot] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [glowValues, setGlowValues] = useState({ size: 15, opacity: 0.15 });
  const [showAd, setShowAd] = useState(true);
  const [buildingProgress, setBuildingProgress] = useState(0);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showMobileLanguageDropdown, setShowMobileLanguageDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const animate = useCallback(() => {
    if (previousTimeRef.current !== undefined) {
      const eyesCenterX = 956;
      const eyesCenterY = 164;
      
      const dx = mousePosition.x - eyesCenterX;
      const dy = mousePosition.y - eyesCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 500;
      
      const intensity = Math.max(0, 1 - distance / maxDistance);
      const targetSize = 20 + 180 * intensity;
      
      // Inverse relationship between size and opacity
      const sizeRatio = (targetSize - 20) / 180; // Normalized size (0 to 1)
      const targetOpacity = 0.15 + (0.7 * intensity * (1 - sizeRatio * 0.5)); // Opacity decreases as size increases

      const currentSize = glowValues.size;
      const currentOpacity = glowValues.opacity;
      
      setGlowValues({
        size: currentSize + (targetSize - currentSize) * 0.3,
        opacity: currentOpacity + (targetOpacity - currentOpacity) * 0.3
      });
    }
    previousTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);
  }, [mousePosition, glowValues]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  const nextBot = () => {
    setCurrentBot((prev) => {
      const next = prev + 1;
      return next >= bots.length ? 0 : next;
    });
  };

  const prevBot = () => {
    setCurrentBot((prev) => {
      const next = prev - 1;
      return next < 0 ? bots.length - 1 : next;
    });
  };

  const handleNavClick = (sectionId: string) => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    const featuresSection = document.querySelector('.features-section');
    
    if (window.scrollY < window.innerHeight) {
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
        
        if (isMobile) {
          window.scrollTo({
            top: featuresSection.getBoundingClientRect().top + window.pageYOffset,
            behavior: 'smooth'
          });
        }
      }
    }

    // For mobile, we don't need to scroll to individual cards since we use the carousel
    if (!isMobile) {
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setActiveSection(sectionId);
          setTimeout(() => setActiveSection(null), 3000);
        }, window.scrollY < window.innerHeight ? 1000 : 0);
      }
    }
    
    setIsMoreOpen(false);
  };

  // Building animation effect
  useEffect(() => {
    if (showAd) {
      const interval = setInterval(() => {
        setBuildingProgress(prev => (prev + 1) % 101);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [showAd]);

  // Building animation helper
  const getBuildingAnimation = (progress: number) => {
    const width = 30;
    const filled = Math.floor((width * progress) / 100);
    const empty = width - filled;
    return `[${'='.repeat(filled)}${empty > 0 ? '>' : ''}${'.'.repeat(Math.max(0, empty - 1))}] ${progress}%`;
  };

  const bots = [
    {
      title: "Journalist MOAI",
      image: "/contents/gazeteci-moai.jpg",
      description: "AI assistant that tracks crypto news and market data in real-time, providing detailed analysis.",
      href: "/journalist-moai",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
      ),
      isActive: true
    },
    {
      title: "Analyst MOAI",
      image: "/contents/analist-moai.jpg",
      description: "AI assistant that performs technical analysis, generates price predictions and trading strategies.",
      href: "/analyst-moai",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      ),
      isActive: true
    },
    {
      title: "Trader MOAI",
      image: "/contents/trader-moai.jpg",
      description: "AI assistant that performs automated trading, portfolio management and risk analysis. (Coming Soon)",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      ),
      isActive: false
    }
  ];

  const menuItems = [
    {
      title: 'Analyst MOAI',
      description: 'AI-Powered Crypto Market Analysis',
      image: '/contents/analysis-moai.jpg',
      link: '/analyst-moai'
    },
    {
      title: 'Journalist MOAI',
      description: 'Real-time Crypto News Analysis',
      image: '/contents/news-moai.jpg',
      link: '/journalist-moai'
    }
  ];

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full hidden md:block" style={{ zIndex: 11 }}>
        <div 
          className="absolute rounded-full mix-blend-screen pointer-events-none will-change-transform"
          style={{
            width: '400px',
            height: '400px',
            left: '1008px',
            top: '151px',
            background: `radial-gradient(circle, rgba(190, 229, 228, ${glowValues.opacity}) 0%, transparent 80%)`,
            filter: 'blur(40px)',
            transform: `translate(-50%, -50%) scale(${glowValues.size / 400})`
          }}
        />
        <div 
          className="absolute rounded-full mix-blend-screen pointer-events-none will-change-transform"
          style={{
            width: '400px',
            height: '400px',
            left: '906px',
            top: '171px',
            background: `radial-gradient(circle, rgba(190, 229, 228, ${glowValues.opacity}) 0%, transparent 80%)`,
            filter: 'blur(40px)',
            transform: `translate(-50%, -50%) scale(${glowValues.size / 400})`
          }}
        />
      </div>

      {/* Advertisement Modal */}
      {showAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xl"></div>
          <div className="relative bg-white/10 backdrop-blur-md p-8 rounded-2xl max-w-5xl w-full mx-4 border border-white/20">
            {/* Close Button */}
            <button 
              onClick={() => setShowAd(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Ad Content */}
            <div className="flex flex-col md:flex-row gap-8">
              {/* Image Section */}
              <div className="w-full md:w-1/2">
                <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                  <Image
                    src="/newterminal.jpeg"
                    alt="MOAI Advertisement"
                    fill
                    className="object-contain bg-black/50"
                    priority
                  />
                </div>
              </div>

              {/* Text Content Section */}
              <div className="w-full md:w-1/2 flex items-center">
                <div className="space-y-6 w-full">
                  <div className="text-left space-y-4">
                    <p className="text-2xl text-blue-400 font-mono">loading new terminal...</p>
                    <div className="font-mono">
                      <p className="text-blue-400">{getBuildingAnimation(buildingProgress)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
              </svg>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* Main Navigation Links */}
              {bots.map((bot, index) => (
                <button
                  key={bot.title}
                  onClick={() => handleNavClick(bot.title.toLowerCase().replace(' ', '-'))}
                  className={`text-gray-300 hover:text-${index === 0 ? 'blue' : index === 1 ? 'purple' : 'yellow'}-400 px-3 py-2 text-sm font-medium relative group`}
                >
                  {bot.title}
                  <span className={`absolute -bottom-1 left-0 w-0 h-px bg-${index === 0 ? 'blue' : index === 1 ? 'purple' : 'yellow'}-400 transition-all duration-300 group-hover:w-full`}></span>
                </button>
              ))}
              <div className="relative">
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium relative"
                >
                  More
                </button>
                {isMoreOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-black ring-1 ring-black ring-opacity-5 divide-y divide-gray-700">
                    <div className="py-1">
                      <Link
                        href="/team"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
                      >
                        Team
                      </Link>
                      <a
                        href="https://dexscreener.com/solana/2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
                      >
                        Dexscreener
                      </a>
                      <a
                        href="https://medium.com/@6emirsahin/moai-i%CC%87lk-yapay-zeka-kripto-fenomeni-ve-ki%C5%9Fisel-yat%C4%B1r%C4%B1m-analisti-ada9eab498a5"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
                      >
                        Roadmap
                      </a>
                      <Link
                        href="/support"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
                      >
                        Support
                      </Link>
                      <button
                        onClick={() => handleNavClick('disclaimer')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
                      >
                        Disclaimer
                      </button>
                    </div>
                    <div className="py-2 px-4 flex justify-center space-x-4">
                      <a
                        href="https://t.me/moaiagents"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.178.121.13.154.309.164.433-.001.061-.013.177-.024.321z"/>
                        </svg>
                      </a>
                      <a
                        href="https://x.com/moAI_Agent"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white"
                      >
                       
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
                >
                  <span className="text-sm font-medium">ENG</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Language Dropdown */}
                {showLanguageDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLanguageDropdown(false)} />
                    <div className="absolute top-full right-0 mt-2 w-24 bg-black/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-xl z-50">
                      <a
                        href="/tr"
                        className="flex items-center justify-center px-4 py-2 text-white hover:bg-gray-800/50 transition-colors rounded-xl"
                      >
                        <span className="text-sm font-medium">TR</span>
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Navigation */}
            <div 
              className={`fixed md:hidden top-20 right-4 w-64 bg-black/95 rounded-xl shadow-lg transition-all duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-4'}`}
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <div className="p-4">
                {/* Main MOAI Links */}
                <div className="flex flex-col space-y-4 mb-6">
                  {bots.map((bot, index) => (
                    bot.isActive ? (
                      <Link
                        key={bot.title}
                        href={bot.href || '#'}
                        onClick={(e) => index === 2 && e.preventDefault()}
                        className={`text-base font-medium text-center transition-all duration-300 flex items-center justify-center gap-2
                          ${index === 0 ? 'text-blue-400 hover:text-blue-300' : 
                            index === 1 ? 'text-purple-400 hover:text-purple-300' : 
                            'text-yellow-400 cursor-not-allowed'}`}
                      >
                        {bot.title}
                        {index === 2 && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                          </svg>
                        )}
                      </Link>
                    ) : (
                      <div
                        key={bot.title}
                        className={`text-base font-medium text-center transition-all duration-300 flex items-center justify-center gap-2
                          ${index === 0 ? 'text-blue-400' : 
                            index === 1 ? 'text-purple-400' : 
                            'text-yellow-400 cursor-not-allowed'}`}
                      >
                        {bot.title}
                        {index === 2 && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    )
                  ))}
                </div>

                {/* Additional Links */}
                <div className="flex flex-col space-y-4 mb-6">
                  <Link
                    href="/team"
                    className="text-white hover:text-gray-300 text-base text-center transition-all duration-300"
                  >
                    Team
                  </Link>
                  <a 
                    href="https://dexscreener.com/solana/2GbE1pq8GiwpHhdGWKUBLXJfBKvKLoNWe1E4KPtbED2M" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300 text-base text-center transition-all duration-300"
                  >
                    Dexscreener
                  </a>
                  <a 
                    href="https://medium.com/@6emirsahin/moai-i%CC%87lk-yapay-zeka-kripto-fenomeni-ve-ki%C5%9Fisel-yat%C4%B1r%C4%B1m-analisti-ada9eab498a5" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300 text-base text-center transition-all duration-300"
                  >
                    Roadmap
                  </a>
                  <Link
                    href="/support"
                    className="text-white hover:text-gray-300 text-base text-center transition-all duration-300"
                  >
                    Support
                  </Link>
                  <button
                    onClick={() => {
                      handleNavClick('disclaimer');
                      setIsMenuOpen(false);
                    }}
                    className="text-white hover:text-gray-300 text-base text-center transition-all duration-300"
                  >
                    Disclaimer
                  </button>
                </div>

                {/* Social Icons */}
                <div className="flex justify-center items-center space-x-6 pt-4 border-t border-gray-800">
                  <a 
                    href="https://t.me/justawiserock" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.178.121.13.154.309.164.433-.001.061-.013.177-.024.321z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://x.com/moAI_Agent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.733-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://www.youtube.com/@MoAIDirector" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>

                {/* Mobile Language Selector */}
                <div className="relative mt-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => setShowMobileLanguageDropdown(!showMobileLanguageDropdown)}
                    className="flex items-center justify-center gap-2 w-full text-white hover:text-gray-300 transition-colors"
                  >
                    <span className="text-sm font-medium">ENG</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {/* Mobile Language Dropdown */}
                  {showMobileLanguageDropdown && (
                    <div className="mt-2 w-full bg-gray-800/50 rounded-xl">
                      <a
                        href="/tr"
                        className="flex items-center justify-center px-4 py-2 text-white hover:bg-gray-700/50 transition-colors rounded-xl"
                      >
                        <span className="text-sm font-medium">TR</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </nav>
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
            <div className="w-full md:w-1/2 z-20 text-left mb-8 md:mb-0 mt-20 md:mt-0">
              <h1 className="text-8xl md:text-[12rem] font-bold text-white relative tracking-wide">
                MOAI
              </h1>
              <p className="text-xl md:text-3xl text-blue-300/80 max-w-2xl mt-4 font-light">
                A rock reborn after discovering Wi-Fi
              </p>
            </div>

            {/* Large MOAI Image */}
            <div className="hidden md:block absolute right-[-30%] h-screen w-[120%] top-0 z-10">
              <div className="relative w-full h-full">
                <Image
                  src="/moai.webp"
                  alt="MOAI"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            {/* Mobile MOAI Image */}
            <div className="relative md:hidden w-full h-[60vh] mb-8 z-10">
              <div className="relative w-full h-full">
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
      </div>

      {/* Features Grid - Desktop */}
      <div className="hidden md:block container mx-auto px-4 py-16 features-section relative z-20">
        <div className="grid grid-cols-3 gap-8">
          {bots.map((bot, index) => (
            <div 
              key={index} 
              id={bot.title.toLowerCase().replace(' ', '-')} 
              className={`relative ${!bot.isActive ? 'opacity-50 cursor-not-allowed' : ''} ${
                activeSection === bot.title.toLowerCase().replace(' ', '-') 
                  ? bot.title === "Journalist MOAI"
                    ? 'shadow-[0_0_50px_rgba(59,130,246,0.5)]'
                    : bot.title === "Analyst MOAI"
                      ? 'shadow-[0_0_50px_rgba(168,85,247,0.5)]'
                      : 'shadow-[0_0_50px_rgba(234,179,8,0.5)]'
                  : ''
              } transition-shadow duration-300`}
            >
              {bot.isActive ? (
                <a href={bot.href} className="block group">
                  <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300 shadow-lg ${
                    bot.title === "Analyst MOAI" 
                      ? "border-purple-900/30 hover:border-purple-500/50"
                      : bot.title === "Trader MOAI"
                        ? "border-yellow-900/30 hover:border-yellow-500/50"
                        : "border-blue-900/30 hover:border-blue-500/50"
                  }`}>
                    <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                      <Image
                        src={bot.image}
                        alt={bot.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        bot.title === "Analyst MOAI"
                          ? "bg-purple-600/20"
                          : bot.title === "Trader MOAI"
                            ? "bg-yellow-600/20"
                            : "bg-blue-600/20"
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${
                          bot.title === "Analyst MOAI"
                            ? "text-purple-400"
                            : bot.title === "Trader MOAI"
                              ? "text-yellow-400"
                              : "text-blue-400"
                        }`}>
                          {bot.icon}
                        </svg>
                      </div>
                      <h2 className={`text-xl font-semibold ${
                        bot.title === "Analyst MOAI"
                          ? "text-purple-300"
                          : bot.title === "Trader MOAI"
                            ? "text-yellow-300"
                            : "text-blue-300"
                      }`}>{bot.title}</h2>
                    </div>
                    <p className="text-gray-400">
                      {bot.description}
                    </p>
                  </div>
                </a>
              ) : (
                <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300 shadow-lg ${
                  bot.title === "Trader MOAI"
                    ? "border-yellow-900/30"
                    : "border-blue-900/30"
                }`}>
                  <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                    <Image
                      src={bot.image}
                      alt={bot.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      bot.title === "Trader MOAI"
                        ? "bg-yellow-600/20"
                        : "bg-blue-600/20"
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${
                        bot.title === "Trader MOAI"
                          ? "text-yellow-400"
                          : "text-blue-400"
                      }`}>
                        {bot.icon}
                      </svg>
                    </div>
                    <h2 className={`text-xl font-semibold ${
                      bot.title === "Trader MOAI"
                        ? "text-yellow-300"
                        : "text-blue-300"
                    }`}>{bot.title}</h2>
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
      <div className="md:hidden container mx-auto px-4 py-16 relative features-section">
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${currentBot * 100}%)` }}>
            {bots.map((bot, index) => (
              <div 
                key={index} 
                id={bot.title.toLowerCase().replace(' ', '-')}
                className="w-full flex-shrink-0 px-4"
              >
                <div className={`${!bot.isActive ? 'opacity-50 cursor-not-allowed' : 'group'}`}>
                  {bot.isActive ? (
                    <Link href={bot.href || '#'} className="block">
                      <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300 shadow-lg ${
                        bot.title === "Analyst MOAI" 
                          ? "border-purple-900/30 hover:border-purple-500/50"
                          : bot.title === "Trader MOAI"
                            ? "border-yellow-900/30 hover:border-yellow-500/50"
                            : "border-blue-900/30 hover:border-blue-500/50"
                      }`}>
                        <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                          <Image
                            src={bot.image}
                            alt={bot.title}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            bot.title === "Analyst MOAI"
                              ? "bg-purple-600/20"
                              : bot.title === "Trader MOAI"
                                ? "bg-yellow-600/20"
                                : "bg-blue-600/20"
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${
                              bot.title === "Analyst MOAI"
                                ? "text-purple-400"
                                : bot.title === "Trader MOAI"
                                  ? "text-yellow-400"
                                  : "text-blue-400"
                            }`}>
                              {bot.icon}
                            </svg>
                          </div>
                          <h2 className={`text-xl font-semibold ${
                            bot.title === "Analyst MOAI"
                              ? "text-purple-300"
                              : bot.title === "Trader MOAI"
                                ? "text-yellow-300"
                                : "text-blue-300"
                          }`}>{bot.title}</h2>
                        </div>
                        <p className="text-gray-400">
                          {bot.description}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300 shadow-lg ${
                      bot.title === "Trader MOAI"
                        ? "border-yellow-900/30"
                        : "border-blue-900/30"
                    }`}>
                      <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden">
                        <Image
                          src={bot.image}
                          alt={bot.title}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          bot.title === "Trader MOAI"
                            ? "bg-yellow-600/20"
                            : "bg-blue-600/20"
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${
                            bot.title === "Trader MOAI"
                              ? "text-yellow-400"
                              : "text-blue-400"
                          }`}>
                            {bot.icon}
                          </svg>
                        </div>
                        <h2 className={`text-xl font-semibold ${
                          bot.title === "Trader MOAI"
                            ? "text-yellow-300"
                            : "text-blue-300"
                        }`}>{bot.title}</h2>
                      </div>
                      <p className="text-gray-400">
                        {bot.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          onClick={prevBot} 
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button 
          onClick={nextBot} 
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Disclaimer Section */}
      <div id="disclaimer" className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Disclaimer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Investment Disclaimer */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Not Financial Advice</h3>
            <p className="text-gray-300 space-y-4">
              All content, summaries, analyses, comments, or opinions provided by MoAI Agent are for informational purposes only.<br/><br/>
              This content should not be considered as investment advice, financial guidance, or a recommendation to buy or sell $MoAI token or any other asset.<br/><br/>
              Users should conduct their own research and seek professional advice before making investment decisions.<br/><br/>
              $MoAI token does not represent any ownership, partnership, or rights in any project.<br/><br/>
              Token value is subject to market conditions, and any losses due to value fluctuations are solely the user's responsibility.
            </p>
          </div>

          {/* Content Disclaimer */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Nature of MoAI Agent's Content</h3>
            <p className="text-gray-300 space-y-4">
              MoAI Agent generates content based on inputs, and this content may contain unpredictable, incomplete, or incorrect information.<br/><br/>
              The accuracy of the provided content is not guaranteed, and users should use this information at their own discretion.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-400">
        <p>© 2024 MOAI AGENT All rights reserved.</p>
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