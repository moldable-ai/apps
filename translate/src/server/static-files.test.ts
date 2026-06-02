import { getStaticContentType, resolveStaticFilePath } from './static-files'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('static file helpers', () => {
  const distDir = path.join('/tmp', 'translate-dist')

  it('resolves app shell and asset paths inside dist', () => {
    expect(resolveStaticFilePath(distDir, '/')).toBe(
      path.join(distDir, 'index.html'),
    )
    expect(resolveStaticFilePath(distDir, '/assets/app.js')).toBe(
      path.join(distDir, 'assets', 'app.js'),
    )
    expect(resolveStaticFilePath(distDir, '/icon.png')).toBe(
      path.join(distDir, 'icon.png'),
    )
  })

  it('rejects traversal outside dist', () => {
    expect(resolveStaticFilePath(distDir, '/assets/../../package.json')).toBe(
      null,
    )
    expect(
      resolveStaticFilePath(distDir, '/assets/%2e%2e/%2e%2e/package.json'),
    ).toBe(null)
  })

  it('maps known static file content types', () => {
    expect(getStaticContentType('/tmp/app.js')).toBe(
      'text/javascript; charset=utf-8',
    )
    expect(getStaticContentType('/tmp/app.css')).toBe('text/css; charset=utf-8')
    expect(getStaticContentType('/tmp/index.html')).toBe(
      'text/html; charset=utf-8',
    )
    expect(getStaticContentType('/tmp/icon.png')).toBe('image/png')
  })
})
