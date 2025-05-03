'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function DisclaimerPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showMobileLanguageDropdown, setShowMobileLanguageDropdown] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="container mx-auto px-4">
          <nav className="flex items-center h-20">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-white mr-12">MOAI</Link>
            
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
              <Link href="/journalist-moai" className="text-gray-300 hover:text-blue-400 px-3 py-2 text-sm font-medium relative group">
                Journalist MOAI
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link href="/analyst-moai" className="text-gray-300 hover:text-purple-400 px-3 py-2 text-sm font-medium relative group">
                Analyst MOAI
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-purple-400 transition-all duration-300 group-hover:w-full"></span>
              </Link>
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
                      <Link
                        href="/disclaimer"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
                      >
                        Disclaimer
                      </Link>
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
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.733-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
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
                <div className="flex flex-col space-y-4 mb-6">
                  <Link href="/journalist-moai" className="text-blue-400 hover:text-blue-300 text-base font-medium text-center transition-all duration-300">
                    Journalist MOAI
                  </Link>
                  <Link href="/analyst-moai" className="text-purple-400 hover:text-purple-300 text-base font-medium text-center transition-all duration-300">
                    Analyst MOAI
                  </Link>
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
                  <Link
                    href="/disclaimer"
                    className="text-white hover:text-gray-300 text-base text-center transition-all duration-300"
                  >
                    Disclaimer
                  </Link>
                </div>

                {/* Social Icons */}
                <div className="flex justify-center items-center space-x-6 pt-4 border-t border-gray-800">
                  <a 
                    href="https://t.me/moaiagents" 
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

      {/* Disclaimer Content */}
      <div className="container mx-auto px-4 py-16">
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