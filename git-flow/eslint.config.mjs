import nextConfig from '@moldable-ai/eslint-config/next'

export default [
  ...nextConfig,
  {
    ignores: ['next-env.d.ts'],
  },
]
