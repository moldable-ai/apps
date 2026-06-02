import type { BookMeta } from '../shared/book'
import {
  addFolder,
  deleteBook,
  getChapter,
  importBook,
  moveBook,
  setProgress,
} from './book-store'
import { getInstalledIds } from './gutenberg-catalog'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

async function withDataDir<T>(fn: (dataDir: string) => Promise<T>): Promise<T> {
  const dataDir = await mkdtemp(join(tmpdir(), 'reader-store-test-'))
  try {
    return await fn(dataDir)
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
}

describe('book store', () => {
  it('does not create orphan progress for missing books', async () => {
    await withDataDir(async (dataDir) => {
      await expect(
        setProgress(dataDir, 'missing-book', { percent: 0.5 }),
      ).rejects.toThrow('Book not found')
    })
  })

  it('lets a book belong to multiple folders', async () => {
    await withDataDir(async (dataDir) => {
      const meta = await importBook(
        dataDir,
        'test.txt',
        new TextEncoder().encode('Hello world.'),
      )
      const fiction = await addFolder(dataDir, 'Fiction')
      const classics = await addFolder(dataDir, 'Classics')

      await moveBook(dataDir, meta.id, fiction.id)
      await expect(moveBook(dataDir, meta.id, classics.id)).resolves.toEqual([
        expect.objectContaining({ id: fiction.id, bookIds: [meta.id] }),
        expect.objectContaining({ id: classics.id, bookIds: [meta.id] }),
      ])

      await expect(
        moveBook(dataDir, meta.id, fiction.id, false),
      ).resolves.toEqual([
        expect.objectContaining({ id: fiction.id, bookIds: [] }),
        expect.objectContaining({ id: classics.id, bookIds: [meta.id] }),
      ])
    })
  })

  it('does not remove a book from folders when moving to an unknown folder', async () => {
    await withDataDir(async (dataDir) => {
      const meta = await importBook(
        dataDir,
        'test.txt',
        new TextEncoder().encode('Hello world.'),
      )
      const folder = await addFolder(dataDir, 'Reading')
      await moveBook(dataDir, meta.id, folder.id)

      await expect(
        moveBook(dataDir, meta.id, 'missing-folder'),
      ).rejects.toThrow('Folder not found')
      await expect(moveBook(dataDir, meta.id, null)).resolves.toEqual([
        expect.objectContaining({ id: folder.id, bookIds: [] }),
      ])
    })
  })

  it('encodes chapter resource URLs with URL-sensitive filenames', async () => {
    await withDataDir(async (dataDir) => {
      const meta: BookMeta = {
        id: 'book with spaces',
        title: 'Book with Spaces',
        author: null,
        format: 'epub',
        language: 'en',
        description: null,
        publisher: null,
        hasCover: false,
        coverColor: 'oklch(0.62 0.13 25)',
        chapters: [
          { index: 0, title: 'Chapter', href: 'chapter.xhtml', wordCount: 2 },
        ],
        wordCount: 2,
        addedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        source: null,
      }
      const chapter = {
        index: 0,
        title: 'Chapter',
        href: 'chapter.xhtml',
        html: '<p><img src="__RES__/OEBPS/images/my cover #1.png"></p>',
        text: 'Hello world',
        wordCount: 2,
      }

      const bookDir = join(dataDir, 'books', meta.id)
      await mkdir(join(bookDir, 'chapters'), { recursive: true })
      await writeFile(join(bookDir, 'book.json'), JSON.stringify(meta))
      await writeFile(
        join(bookDir, 'chapters', '0.json'),
        JSON.stringify(chapter),
      )

      await expect(
        getChapter(dataDir, meta.id, 0, 'w=personal'),
      ).resolves.toEqual(
        expect.objectContaining({
          html: '<p><img src="/api/books/book%20with%20spaces/resource/OEBPS/images/my%20cover%20%231.png?w=personal"></p>',
        }),
      )
    })
  })

  it('clears store install markers when deleting store-installed books', async () => {
    await withDataDir(async (dataDir) => {
      const existing: BookMeta = {
        id: 'store-book',
        title: 'Store Book',
        author: null,
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
        source: 'gutenberg-456.epub',
      }

      const bookDir = join(dataDir, 'books', existing.id)
      await mkdir(bookDir, { recursive: true })
      await writeFile(join(bookDir, 'book.json'), JSON.stringify(existing))
      await mkdir(join(dataDir, 'store'), { recursive: true })
      await writeFile(
        join(dataDir, 'store', 'installed.json'),
        JSON.stringify(['gutenberg:456', 789]),
      )

      await expect(getInstalledIds(dataDir)).resolves.toEqual(['gutenberg:456'])
      await deleteBook(dataDir, existing.id)
      await expect(getInstalledIds(dataDir)).resolves.toEqual([])
    })
  })
})
