'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Support() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="w-full p-6 bg-black/30 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Link href="/" className="text-white hover:text-blue-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="relative w-12 h-12 ring-2 ring-blue-500/50 rounded-full overflow-hidden shadow-lg shadow-blue-500/20">
            <Image
              src="/moai.webp"
              alt="MOAI"
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <h1 className="text-xl font-bold text-white">MOAI Support</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
          
          <div className="text-center">
            <p className="text-gray-300 mb-4">For support inquiries, please email us at:</p>
            <a 
              href="mailto:support@moaiagent.com" 
              className="text-xl text-blue-400 hover:text-blue-300 transition-colors"
            >
              support@moaiagent.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
} 