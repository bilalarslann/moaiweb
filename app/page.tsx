'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import React from 'react';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBot, setCurrentBot] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 855, y: 152 });
  const [glowPosition2, setGlowPosition2] = useState({ x: 752, y: 167 });

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

  const nextBot = () => {
    setCurrentBot((prev) => (prev + 1) % bots.length);
  };

  const prevBot = () => {
    setCurrentBot((prev) => (prev - 1 + bots.length) % bots.length);
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
    },
    {
      title: "Analyst MOAI",
      image: "/contents/analist-moai.jpg",
      description: "AI assistant that performs technical analysis, generates price predictions and trading strategies.",
      href: "/analyst-moai",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      ),
    }
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Welcome to MOAI AI - Your Crypto Intelligence Assistant
        </p>
      </div>

      <div className="relative flex place-items-center">
        <div className="absolute top-0 left-0 w-full h-full" style={getGlowStyle(glowPosition)} />
        <div className="absolute top-0 left-0 w-full h-full" style={getGlowStyle(glowPosition2)} />
        <Image
          src="/moai.webp"
          alt="MOAI Logo"
          width={180}
          height={180}
          priority
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
        />
      </div>

      <div className="grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left gap-8">
        {bots.map((bot, index) => (
          <Link
            key={index}
            href={bot.href}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <div className="flex items-center mb-3">
              <svg
                className="w-6 h-6 mr-2 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                {bot.icon}
              </svg>
              <h2 className="text-2xl font-semibold">{bot.title}</h2>
            </div>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">{bot.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
