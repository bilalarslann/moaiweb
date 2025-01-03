/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
        'utf-8-validate': false,
        'bufferutil': false,
        'jsdom': false
      };
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['jsdom', '@sparticuz/chromium']
  }
};

module.exports = nextConfig;
