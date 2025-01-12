/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['assets.coingecko.com'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: true,
  },
  typescript: {
    // Similarly, TypeScript errors won't stop the production build
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
