import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@moldable/ui'],
  devIndicators: false,
}

export default nextConfig
