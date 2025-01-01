'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBot, setCurrentBot] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const bots = [
    {
      title: "Journalist MOAI",
      description: "AI assistant that tracks crypto news and market data in real-time, providing detailed analysis.",
      image: "/gazeteci-moai.png",
      link: "/gazeteci-moai",
      isActive: true
    },
    {
      title: "Analyst MOAI",
      description: "AI assistant that performs technical analysis, generates price predictions and trading strategies.",
      image: "/analist-moai.png",
      link: "/analist-moai",
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculateGlowStyle = (botIndex: number) => {
    const botElement = document.querySelector(`#bot-${botIndex}`);
    if (!botElement) return { size: 0, opacity: 0 };

    const rect = botElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - centerX, 2) + 
      Math.pow(mousePosition.y - centerY, 2)
    );

    const maxDistance = 300;
    const size = Math.max(0, 1 - distance / maxDistance);
    const opacity = size * 0.5;

    return { size, opacity };
  };

  const nextBot = () => {
    setCurrentBot((prev) => (prev + 1) % bots.length);
  };

  const prevBot = () => {
    setCurrentBot((prev) => (prev - 1 + bots.length) % bots.length);
  };

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-lg shadow-lg shadow-black/20' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Image src="/moai.png" alt="MOAI AI" width={40} height={40} className="rounded-lg" />
              <div>
                <h1 className="text-xl font-bold">MOAI AI</h1>
                <p className="text-sm text-blue-300/80">Crypto Assistants</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link href="#disclaimer" className="text-gray-300 hover:text-white transition-colors">
                Disclaimer
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="#disclaimer" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">
                Disclaimer
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
            Welcome to MOAI AI
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your intelligent crypto companion powered by advanced AI technology.
          </p>
        </div>

        {/* Bot Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {bots.map((bot, index) => (
            <Link
              key={index}
              href={bot.link}
              id={`bot-${index}`}
              className={`group relative bg-gradient-to-br ${
                index === 0
                  ? 'from-blue-900/20 to-blue-800/20 hover:from-blue-900/30 hover:to-blue-800/30'
                  : 'from-purple-900/20 to-purple-800/20 hover:from-purple-900/30 hover:to-purple-800/30'
              } rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/20`}
            >
              <div className="flex items-center space-x-4 mb-4">
                <Image
                  src={bot.image}
                  alt={bot.title}
                  width={60}
                  height={60}
                  className="rounded-xl"
                />
                <div>
                  <h2 className="text-xl font-bold">{bot.title}</h2>
                  <p className="text-sm text-blue-300/80">AI Assistant</p>
                </div>
              </div>
              <p className="text-gray-400">{bot.description}</p>
            </Link>
          ))}
        </div>

        {/* Disclaimer Section */}
        <div id="disclaimer" className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">Disclaimer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Not Financial Advice */}
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <h3 className="text-xl font-bold mb-4">Not Financial Advice</h3>
              <p className="text-gray-400">
                The information provided by MOAI AI is for general information and educational purposes only. It should not be considered as financial advice. Always conduct your own research and consult with qualified financial advisors before making any investment decisions.
              </p>
            </div>

            {/* Nature of MoAI Agent's Content */}
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <h3 className="text-xl font-bold mb-4">Nature of MoAI Agent's Content</h3>
              <p className="text-gray-400">
                MOAI AI uses advanced language models and data analysis to provide insights and information. While we strive for accuracy, the content generated is based on available data and should be verified independently. Market conditions are volatile and past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>© 2024 MOAI AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
} 