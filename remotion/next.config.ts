import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Exclude Node.js modules from client bundling
  serverExternalPackages: [
    'child_process',
    '@remotion/bundler',
    '@remotion/renderer',
  ],
}

export default nextConfig
