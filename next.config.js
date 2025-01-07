/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
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
