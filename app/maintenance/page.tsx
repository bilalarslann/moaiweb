'use client';

import React from 'react';
import Image from 'next/image';

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <Image
            src="/moai.webp"
            alt="MOAI"
            fill
            className="object-cover rounded-2xl"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-white">🛠️ Maintenance Mode</h1>
        
        <div className="space-y-4">
          <p className="text-purple-300 text-lg">
            We are currently performing maintenance on our system. We will be back shortly to provide you with better service.
          </p>
          
          <p className="text-purple-400/80 text-sm">
            Thank you for your patience.
          </p>
        </div>

        <div className="pt-8">
          <div className="animate-pulse flex justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
} 