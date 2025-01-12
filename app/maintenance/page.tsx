'use client';

import Image from 'next/image';

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="relative w-24 h-24 mb-8">
        <Image
          src="/moai.webp"
          alt="MOAI"
          width={96}
          height={96}
          className="rounded-full ring-4 ring-purple-500/50"
        />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">🚧 Bakım Modu</h1>
      <p className="text-purple-300 text-center max-w-md mb-8">
        Analyst MOAI şu anda bakımda. Daha iyi hizmet verebilmek için çalışıyoruz. Lütfen daha sonra tekrar deneyin.
      </p>
      <div className="text-purple-400/60 text-sm">
        Tahmini tamamlanma: Yakında™
      </div>
    </div>
  );
} 