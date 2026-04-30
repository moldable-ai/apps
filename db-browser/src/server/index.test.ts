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

  it('resolves widget routes to the built widget html entry', () => {
    expect(resolveStaticFilePath('/widget')).toBe(
      path.join(process.cwd(), 'dist', 'widget.html'),
    )
  })
})
