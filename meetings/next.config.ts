import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@moldable-ai/ui'],
  devIndicators: false,
}

export default nextConfig
