'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const founders = [
  {
    name: 'EMİR ŞAHİN',
    role: 'Co-Founder',
    image: '/moai.webp'
  },
  {
    name: 'BİLAL ARSLAN',
    role: 'Co-Founder',
    image: '/moai.webp'
  }
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="w-full p-6 bg-black/30 backdrop-blur-sm border-b border-purple-900/30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div className="relative w-12 h-12 ring-2 ring-purple-500/50 rounded-full overflow-hidden shadow-lg shadow-purple-500/20">
              <Image
                src="/moai.webp"
                alt="MOAI"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MOAI Team</h1>
              <p className="text-sm text-purple-300/80">Founders & Core Team</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {founders.map((founder, index) => (
            <div 
              key={index}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 border-2 border-purple-500/30 rounded-2xl"></div>
                  <Image
                    src={founder.image}
                    alt={founder.name}
                    fill
                    className="object-cover rounded-2xl"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{founder.name}</h2>
                <p className="text-purple-400 font-medium">{founder.role}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 