import type { BookMeta } from '../shared/book'
import { getInstalledIds, installFromGutenberg } from './gutenberg-catalog'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function withDataDir<T>(fn: (dataDir: string) => Promise<T>): Promise<T> {
  const dataDir = await mkdtemp(join(tmpdir(), 'reader-test-'))
  try {
    return await fn(dataDir)
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
}

describe('gutenberg catalog installs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an already imported store book without downloading it again', async () => {
    await withDataDir(async (dataDir) => {
      const existing: BookMeta = {
        id: 'existing-book',
        title: 'Existing Book',
        author: 'A. Writer',
        format: 'epub',
        language: 'en',
        description: null,
        publisher: null,
        hasCover: false,
        coverColor: 'oklch(0.62 0.13 25)',
        chapters: [],
        wordCount: 0,
        addedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        source: 'gutenberg-123.epub',
      }

      const bookDir = join(dataDir, 'books', existing.id)
      await mkdir(bookDir, { recursive: true })
      await writeFile(join(bookDir, 'book.json'), JSON.stringify(existing))

      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await expect(installFromGutenberg(dataDir, 123)).resolves.toEqual(
        existing,
      )
      expect(fetchMock).not.toHaveBeenCalled()
      await expect(getInstalledIds(dataDir)).resolves.toEqual(['gutenberg:123'])
    })
  })
})
