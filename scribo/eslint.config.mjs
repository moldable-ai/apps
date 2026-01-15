import nextConfig from '@moldable/eslint-config/next'

export default [
  ...nextConfig,
  {
    ignores: ['next-env.d.ts', 'prettier.config.cjs'],
  },
]
