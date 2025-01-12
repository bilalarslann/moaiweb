/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'assets.coingecko.com',
      'static.coingecko.com',
      'www.coingecko.com'
    ],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'puppeteer-core': 'puppeteer-core',
        '@sparticuz/chromium': '@sparticuz/chromium'
      });
    }
    return config;
  }
}

module.exports = nextConfig
