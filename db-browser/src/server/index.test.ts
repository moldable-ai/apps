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

  it('does not resolve encoded asset traversal outside dist', () => {
    const filePath = resolveStaticFilePath('/assets/%2e%2e/connections.json')

    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      '__not_found__',
    )
  })

  it('falls back to the app shell for non-asset routes', () => {
    expect(resolveStaticFilePath('/connections/abc')).toBe(
      path.join(process.cwd(), 'dist', 'index.html'),
    )
  })
})
