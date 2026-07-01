import { app } from './app'
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
})

describe('API hardening', () => {
  it('rejects unsafe REST requests without the Slides client header', async () => {
    const res = await app.fetch(
      new Request('http://slides.local/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nope' }),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('rejects invalid workspace ids before storage resolution', async () => {
    const res = await app.fetch(
      new Request('http://slides.local/api/decks?workspace=../personal'),
    )

    expect(res.status).toBe(400)
  })
})
