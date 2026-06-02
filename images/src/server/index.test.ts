import { resolveStaticFilePath } from './static'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('resolveStaticFilePath', () => {
  it('resolves built asset paths under dist', () => {
    const filePath = resolveStaticFilePath('/assets/index-abc123.js')
    const expectedPath = path.join(
      process.cwd(),
      'dist',
      'assets/index-abc123.js',
    )

    expect(filePath).toBe(expectedPath)
    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      'assets/index-abc123.js',
    )
  })

  it('does not resolve encoded traversal outside dist assets', () => {
    const filePath = resolveStaticFilePath('/assets/%2e%2e/package.json')
    const distAssetsPath = path.join(process.cwd(), 'dist', 'assets')

    expect(filePath).toBe(path.join(process.cwd(), 'dist', '__not_found__'))
    expect(path.relative(distAssetsPath, filePath).startsWith('..')).toBe(true)
  })

  it('does not resolve malformed encoded paths', () => {
    expect(resolveStaticFilePath('/assets/%E0%A4%A')).toBe(
      path.join(process.cwd(), 'dist', '__not_found__'),
    )
  })
})
