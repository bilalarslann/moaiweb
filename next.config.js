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
      config.externals = [...config.externals, 'puppeteer-core', '@sparticuz/chromium'];
    }
    return config;
  }
}

module.exports = nextConfig
