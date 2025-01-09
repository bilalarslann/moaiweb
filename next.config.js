/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'assets.coingecko.com',
      'static.coingecko.com',
      'www.coingecko.com'
    ],
  },
  experimental: {
    // Server Actions are enabled by default in Next.js 14
    // serverActions: true
  }
}

module.exports = nextConfig
